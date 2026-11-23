# Unified Login: Meta checklist and real-account test plan

Production domain used below: `https://autodm-phi-hazel.vercel.app` (replace if yours differs).

## 1. Meta Developer Dashboard

| Where | Value |
|---|---|
| Facebook Login for Business → Settings → Valid OAuth Redirect URIs | `<domain>/api/instagram/oauth/callback` (exact match) |
| Facebook Login for Business → Configuration | Token type: **Business Integration System User access token**; permissions: `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages` |
| Webhooks → Instagram → Callback URL | `<domain>/api/webhooks/instagram` + the verify token from AutoDM Settings |
| Webhooks → Instagram → Fields | `comments` subscribed (add `messaging_postbacks` only if the follow gate is re-enabled) |
| App roles → Roles → Instagram Testers | every test commenter account, invite accepted on instagram.com |
| Settings → Basic | Privacy policy `<domain>/privacy`, data deletion `<domain>/api/instagram/data-deletion` |

While the app is in Development mode, only accounts with a role on the app trigger webhooks.
Going Live needs App Review (Advanced access) for the comments and messages permissions.

## 2. Vercel environment variables (Production)

`APP_URL`, `APP_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CRON_SECRET`,
`ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_PASSWORD`. Meta App ID, Config ID and App Secret are
stored encrypted in the database via Settings, not in env vars.

## 3. Real-account test plan

Prerequisites: connected professional account, active campaign on a specific post, a second
account that is an accepted Instagram Tester.

| # | Test | Steps | Pass when |
|---|---|---|---|
| 1 | OAuth connect | Settings → Instagram → Connect | `connected=1`; `instagram_accounts` row has `token_type=business_integration_system_user` |
| 2 | Callback state | Open the callback URL with a bad `state` | Redirects with `error=invalid_state`; nothing stored |
| 3 | Webhook verify | Meta "Verify and save" | HTTP 200; log `webhook.verification status=200` |
| 4 | Webhook signature | POST without a valid signature | Rejected, no delivery row |
| 5 | Comment received | Tester comments on the post | Delivery row appears within about 30 s |
| 6 | Keyword match | Comment the keyword / any comment | `matched` with the right `rule_id` |
| 7 | Public reply | (as above) | Reply visible under the comment, `public_reply_status=sent` |
| 8 | Private DM | (as above) | DM arrives with the link, `dm_status=sent` |
| 9 | Duplicate | Replay the same webhook | One delivery only (`comment_id` is UNIQUE) |
| 10 | Once per user | Same account comments again | Second comment skipped |
| 11 | Follow check | Commenter taps the button, once following and once not | See section 4 |
| 12 | Token lifecycle | Revoke the app in Meta, then comment | Delivery fails with an auth error code, visible in Activity |
| 13 | API errors | Comment older than 7 days (manual send) | Failure recorded with a readable error, no crash |

## 4. Follow gate

Status: disabled for Unified Login until test 11 passes. Procedure: have a commenter message or tap
a button (consent), then call `GET /{igsid}?fields=is_user_follow_business` with the stored token.
If it returns a boolean matching reality in both states, restore the gate. If it errors, keep it
off and use the honest fallback ("we cannot verify automatically").
