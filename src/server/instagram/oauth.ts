import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { appUrl } from "@/env";
import { deriveKey, randomToken, safeEqual } from "@/server/crypto";
import type { InstagramAccount } from "@/server/db/schema";
import type { SubscriptionStatus } from "@/lib/webhook-diagnostics";
import { logger } from "@/server/log";
import { getSettings, setSetting } from "@/server/settings";
import { upsertAccount } from "./account";
import { META_AUTHORIZE_URL, META_CODE_EXCHANGE_URL } from "./constants";
import { GraphApiError, graphId, graphRequest, safeErrorMessage } from "./graph";

const log = logger("oauth");

export const OAUTH_STATE_COOKIE = "ig_oauth_state";
export const OAUTH_STATE_MAX_AGE_S = 10 * 60;
export const OAUTH_CALLBACK_PATH = "/api/instagram/oauth/callback";

/** Machine-readable failure reasons surfaced to the settings page as `?error=<code>`. */
export type OAuthErrorCode =
  | "missing_app_credentials"
  | "missing_configuration"
  | "access_denied"
  | "invalid_state"
  | "missing_code"
  | "missing_permissions"
  | "token_exchange_failed"
  | "profile_fetch_failed"
  | "multiple_accounts";

export class OAuthFlowError extends Error {
  override readonly name = "OAuthFlowError";
  constructor(
    readonly code: OAuthErrorCode,
    readonly cause?: unknown,
  ) {
    super(code);
  }
}

/** The redirect URI registered in the Meta app dashboard. */
export function oauthRedirectUri(): string {
  return `${appUrl()}${OAUTH_CALLBACK_PATH}`;
}

/* ---------------------------------- state ---------------------------------- */

function signState(state: string): string {
  return createHmac("sha256", deriveKey("session")).update(`ig-oauth:${state}`).digest("base64url");
}

/** New CSRF state: `state` goes to Instagram, `cookieValue` into an httpOnly cookie. */
export function createOAuthState(): { state: string; cookieValue: string } {
  const state = randomToken(32);
  return { state, cookieValue: `${state}.${signState(state)}` };
}

/** Timing-safe check that the returned `state` matches the signed cookie. */
export function verifyOAuthState(returnedState: string | null, cookieValue: string | undefined): boolean {
  if (!returnedState || !cookieValue) return false;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return false;
  const state = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  return safeEqual(sig, signState(state)) && safeEqual(state, returnedState);
}

/* ---------------------------------- flow ----------------------------------- */

async function getAppCredentials(): Promise<{ appId: string; appSecret: string; configId: string }> {
  const s = await getSettings(["meta.appId", "meta.appSecret", "meta.configId"]);
  const appId = s["meta.appId"];
  const appSecret = s["meta.appSecret"];
  if (!appId || !appSecret) throw new OAuthFlowError("missing_app_credentials");
  const configId = s["meta.configId"];
  if (!configId) throw new OAuthFlowError("missing_configuration");
  return { appId, appSecret, configId };
}

/** Builds the Facebook Login for Business URL for Instagram API Unified Login. */
export async function buildAuthorizeUrl(state: string): Promise<string> {
  const { appId, configId } = await getAppCredentials();
  const url = new URL(META_AUTHORIZE_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("config_id", configId);
  url.searchParams.set("redirect_uri", oauthRedirectUri());
  url.searchParams.set("response_type", "code");
  // Required with config_id: otherwise the configuration's default response type wins.
  url.searchParams.set("override_default_response_type", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

const accessTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});
const businessIdSchema = z.object({ client_business_id: graphId });
const assignedAccountSchema = z.object({ id: graphId, username: z.string().min(1) });
const assignedAccountsSchema = z.object({ data: z.array(assignedAccountSchema) });

const subscribeSchema = z.object({ success: z.boolean().optional() });

export interface ConnectResult {
  account: InstagramAccount;
  /** False when the account was saved but the webhook subscription failed (retryable). */
  subscribed: boolean;
}

/**
 * Completes Unified Login: code -> Business Integration System User token -> business/account
 * discovery, encrypted storage, and account webhook subscription.
 */
export async function completeOAuth(rawCode: string): Promise<ConnectResult> {
  const { appId, appSecret, configId } = await getAppCredentials();
  const code = rawCode.replace(/#_$/, "");
  let accessToken: string;
  let expiresInSeconds: number | null;
  let clientBusinessId: string;
  try {
    const token = await graphRequest({
      path: META_CODE_EXCHANGE_URL,
      query: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: oauthRedirectUri(),
        code,
      },
      schema: accessTokenSchema,
      retries: 0,
    });
    accessToken = token.access_token;
    expiresInSeconds = token.expires_in ?? null;
    const business = await graphRequest({
      path: "/me",
      query: { fields: "client_business_id" },
      accessToken,
      schema: businessIdSchema,
    });
    clientBusinessId = business.client_business_id;
  } catch (err) {
    if (err instanceof OAuthFlowError) throw err;
    throw new OAuthFlowError("token_exchange_failed", err);
  }

  let profile: z.infer<typeof assignedAccountSchema>;
  try {
    const assigned = await graphRequest({
      path: "/me/assigned_instagram_accounts",
      query: { fields: "id,username" },
      accessToken,
      schema: assignedAccountsSchema,
    });
    if (assigned.data.length > 1) throw new OAuthFlowError("multiple_accounts");
    if (assigned.data.length === 0) throw new Error("No Instagram account was assigned to the configuration");
    profile = assigned.data[0]!;
  } catch (err) {
    if (err instanceof OAuthFlowError) throw err;
    throw new OAuthFlowError("profile_fetch_failed", err);
  }

  const account = await upsertAccount({
    igUserId: profile.id,
    username: profile.username,
    accessToken,
    expiresInSeconds,
    tokenType: "business_integration_system_user",
    clientBusinessId,
    configId,
  });

  const status = await subscribeAndRecord(accessToken, profile.id, "connect");
  return { account, subscribed: status.ok };
}

/** Subscribes the app to the account's required webhook fields. Returns false on failure. */
export async function subscribeToWebhooks(accessToken: string, igUserId: string): Promise<boolean> {
  return (await subscribeWithDetails(accessToken, igUserId)).ok;
}

/** The comment automation currently needs only the Instagram `comments` webhook field. */
export const WEBHOOK_SUBSCRIBED_FIELDS = "comments";

const subscribedAppsSchema = z.object({
  data: z.array(z.looseObject({ subscribed_fields: z.array(z.string()).optional() })).optional(),
});

/**
 * `POST /{ig-user-id}/subscribed_apps?subscribed_fields=comments`, then (best-effort) reads back the
 * subscribed fields. Never throws for Graph API errors; the error text is token-free.
 */
export async function subscribeWithDetails(
  accessToken: string,
  igUserId: string,
): Promise<{ ok: boolean; fields?: string[]; error?: string }> {
  try {
    const res = await graphRequest({
      method: "POST",
      path: `/${encodeURIComponent(igUserId)}/subscribed_apps`,
      query: { subscribed_fields: WEBHOOK_SUBSCRIBED_FIELDS },
      accessToken,
      schema: subscribeSchema,
      idempotent: true,
    });
    if (res.success === false) return { ok: false, error: "Instagram answered success: false" };
  } catch (err) {
    if (err instanceof GraphApiError) return { ok: false, error: safeErrorMessage(err, [accessToken], 300) };
    throw err;
  }
  try {
    const current = await graphRequest({
      path: `/${encodeURIComponent(igUserId)}/subscribed_apps`,
      accessToken,
      schema: subscribedAppsSchema,
      retries: 0,
      timeoutMs: 5_000,
    });
    const fields = [...new Set((current.data ?? []).flatMap((d) => d.subscribed_fields ?? []))].slice(0, 20);
    return { ok: true, fields };
  } catch {
    return { ok: true };
  }
}

/** Subscribes and persists the outcome in the `webhook.subscription` setting (best-effort). */
export async function subscribeAndRecord(
  accessToken: string,
  igUserId: string,
  source: SubscriptionStatus["source"],
): Promise<SubscriptionStatus> {
  const result = await subscribeWithDetails(accessToken, igUserId);
  const status: SubscriptionStatus = {
    ok: result.ok,
    at: new Date().toISOString(),
    source,
    ...(result.fields ? { fields: result.fields } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
  try {
    await setSetting("webhook.subscription", status);
  } catch (err) {
    log.warn("webhook.subscription_record_failed", { err: safeErrorMessage(err) });
  }
  log.info("webhook.subscribed", { ok: status.ok, source, fields: status.fields });
  return status;
}
