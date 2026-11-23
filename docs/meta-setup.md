# Meta Instagram setup (Unified Login)

This guide is for a Meta app that uses **Instagram API with Unified Login** through Facebook Login
for Business. It does not use the retired/unsupported Instagram Login setup screen expected by older
AutoDM releases.

## Requirements

- An Instagram **Professional** account (Business or Creator).
- In Instagram, turn on **Settings → Messages and story replies → Message controls → Connected tools
  → Allow access to messages**.
- A Meta app owned by a business portfolio with the **Manage messaging & content on Instagram** use
  case and Facebook Login for Business enabled.
- A reachable HTTPS AutoDM URL. Meta cannot reach `localhost`; use a secure tunnel only for temporary
  local tests.

## Configure Unified Login

1. In [Meta for Developers](https://developers.facebook.com/apps), open the app and select **Use
   cases → Manage messaging & content on Instagram → Customize → API setup with Unified login**.
2. Create or edit the Facebook Login for Business configuration. Select **System-user access token
   (SUAT)** and the **Never** expiration that you already use.
3. Share the Instagram professional account required by AutoDM. This app currently supports one
   connected account at a time; configure/share only that account.
4. Grant only these permissions for the features currently implemented:

   | Permission | AutoDM use |
   | --- | --- |
   | `instagram_basic` | Discover the connected account and read its profile/media |
   | `instagram_manage_comments` | Read and reply to comments |
   | `instagram_manage_messages` | Send the comment private reply (DM) |

   Do not add ad or publishing permissions for AutoDM. Meta's default configuration may include
   `ads_management`, `ads_read`, or `instagram_content_publish`; remove them if they are selected.
5. In the same configuration, set the redirect URL to the exact URL shown in **AutoDM → Settings →
   Instagram → OAuth redirect URI**. Save the configuration and copy its **Configuration ID**.
6. In **App settings → Basic**, copy the Meta **App ID** and **App Secret**. Do not paste the App
   Secret into chat, source code, or a browser form outside your AutoDM instance.
7. In AutoDM, open **Settings → Instagram → Meta app**, enter the Meta App ID and Configuration ID,
   enter the App Secret, and save. AutoDM encrypts the secret in Postgres and never sends it to
   browser JavaScript.

The configuration ID is an identifier, not a secret. Meta obtains the permissions/assets from that
configuration, so AutoDM does not send an OAuth `scope` list.

## Connect the account

1. Select **Connect Instagram** in **Settings → Instagram**.
2. Sign in with Instagram or Facebook, select the business portfolio and the configured Instagram
   account, and approve the requested permissions.
3. Meta returns an authorization code. AutoDM exchanges it server-to-server using the Meta App ID
   and App Secret, discovers the assigned Instagram account, encrypts the returned access token, and
   subscribes that account to comment webhooks.

Unified Login returns a Business Integration System User Access Token (shown as **System-user
access token (SUAT)** in the dashboard). `/me` is the business integration system user; AutoDM uses
`/me/assigned_instagram_accounts` to discover the selected professional account and stores its ID,
client business ID, configuration ID, and encrypted token. Instagram API requests use
`graph.facebook.com` and the explicit Instagram account ID.

For a Never-expiring SUAT, AutoDM does not call Instagram Login's 60-day token refresh endpoint.
Never-expiring means no scheduled expiration, not permanent validity: the business can revoke the
grant, remove the app, or move the account. API authorization errors require reconnecting. The daily
cron is retained for database data-retention cleanup; it does not refresh this token.

## Webhooks

1. In the Meta app's **API setup with Unified login → Configure webhooks**, set the callback URL to
   the URL shown in AutoDM → Settings → Instagram (**`{APP_URL}/api/webhooks/instagram`**).
2. Copy AutoDM's webhook verify token into Meta and select **Verify and save**. The endpoint checks
   `hub.verify_token` and returns `hub.challenge`.
3. Subscribe the app to the **`comments`** field. The app checks `X-Hub-Signature-256` using the Meta
   App Secret before processing events. Duplicate comment IDs are idempotent.
4. After connection, AutoDM calls the Instagram account's `/subscribed_apps` edge with the
   configured webhook fields. Check **Settings → Instagram → Webhook diagnostics** for the saved
   subscription result and requests.

Meta requires HTTPS and documents Advanced Access for live `comments` notifications. In Development
mode, test with an account that has the required app role and has accepted the Instagram Tester
invite. Standard Access is limited to people with a role on the app. Connecting the app for general
public use requires Live mode, Advanced Access through App Review for the required permissions, and
Meta's business verification requirements. Don't assume a public non-tester will trigger development
webhooks.

## Production callback URLs

Use the deployment's actual HTTPS domain; copy the URLs shown in AutoDM and match them character for
character in Meta:

- OAuth redirect: `{APP_URL}/api/instagram/oauth/callback`
- Webhook callback: `{APP_URL}/api/webhooks/instagram`
- Deauthorization callback: `{APP_URL}/api/instagram/deauthorize`
- Data deletion callback: `{APP_URL}/api/instagram/data-deletion`
- Public privacy policy: `{APP_URL}/privacy`
- Terms: `{APP_URL}/terms`
- Data deletion instructions: `{APP_URL}/data-deletion`

The deauthorization and data-deletion routes are implemented by AutoDM. Add those callback URLs in
the Facebook Login for Business settings when Meta presents the corresponding fields. Enter a
public operator name and contact email in **Settings → Account → Public contact** before submitting
Meta's review.

## Permissions and review

- `instagram_basic`, `instagram_manage_comments`, and `instagram_manage_messages` are needed for
  account/media access, comment moderation, and messaging respectively.
- AutoDM does not need ads, publishing, insights, or marketing-message permissions for comment-to-DM.
- Saving a Unified Login configuration grants Standard Access for testing with people who have app
  roles. Meta's current Unified Login guidance says Advanced Access and Live mode are needed to
  connect clients without app roles. The Webhooks setup guide specifically says Advanced Access is
  required for `comments` notifications in production. Follow the access level shown for your app
  and permissions in the dashboard; don't promise public delivery before Meta grants it.

### Follow gate

AutoDM's existing follow-gate UI and code were written for earlier API behavior. The current
Unified Login documentation does not confirm that the automated follower-check endpoint is supported
with a Unified Login SUAT and a comment private-reply event. Keep the feature off until Meta's
documentation and a real API test confirm it. AutoDM must not claim a follower check based only on a
comment or postback.

## Comment-to-DM behavior and test

Meta's private reply is initiated by a comment event and uses the comment ID as the recipient. The
public reply uses the comment's replies edge. Respect Meta's private-reply eligibility, delivery
limits, messaging rules, and rate limits; a successful webhook receipt alone does not prove a reply
or DM was sent.

Test with a second Instagram account:

1. Create a campaign targeting a test post or Reel and add a keyword rule with a public reply and DM.
2. Comment the keyword from the second account.
3. Confirm the comment arrives in **Activity**, the public reply appears, the DM arrives, and the
   Activity row reports success.
4. Repeat the same webhook test or comment to check duplicate handling, then test a non-matching
   comment and the kill switch.

Do not mark the integration working until the real comment, public reply, and DM have all been
observed. See [troubleshooting.md](troubleshooting.md) if one step fails.

## Official references

- [Unified Login overview](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login)
- [Unified Login setup and OAuth/account discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
- [Unified Login authentication and token lifecycle](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication)
- [Unified Login permissions and App Review](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions)
- [Unified Login migration guide](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/migration)
- [Instagram Webhooks setup](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup)
- [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)
