import "server-only";
import { listWebhookRequests } from "@/server/repos/webhook-requests";
import type { SubscriptionStatus } from "@/lib/webhook-diagnostics";
import { WebhookDiagnosticsCard } from "./webhook-diagnostics-card";

/** Keep optional webhook history outside the settings page's critical data load. */
export async function WebhookDiagnosticsPanel({
  accountConnected,
  webhookUrl,
  mode,
  subscription,
}: {
  accountConnected: boolean;
  webhookUrl: string;
  mode: "webhook" | "n8n";
  subscription: SubscriptionStatus | null;
}) {
  const rows = await listWebhookRequests(undefined, 60);
  return (
    <WebhookDiagnosticsCard
      requests={rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        source: row.source,
        result: row.result,
        statusCode: row.statusCode,
        entries: row.entries,
        commentEvents: row.commentEvents,
        matchedEntries: row.matchedEntries,
        createdAt: row.createdAt,
      }))}
      subscription={subscription}
      accountConnected={accountConnected}
      webhookUrl={webhookUrl}
      mode={mode}
    />
  );
}
