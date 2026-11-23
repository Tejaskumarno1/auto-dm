# Meta App Review pack (go Live without tester accounts)

Domain: `https://autodm-phi-hazel.vercel.app`. All URLs below were verified live.

## 1. Basic settings (App settings → Basic)
- Privacy Policy URL: `<domain>/privacy`
- Terms of Service URL: `<domain>/terms`
- User data deletion: URL `<domain>/data-deletion` or callback `<domain>/api/instagram/data-deletion`
- Deauthorize callback: `<domain>/api/instagram/deauthorize`
- App icon 1024x1024 (upload from `public/icons`), category, contact email.
- Business verification (Business settings → Security centre) usually required for Advanced access.

## 2. Permissions to request (Advanced access)
| Permission | Use description to paste |
|---|---|
| `instagram_business_basic` | Identify the connected professional account (username and ID) so automations run only for the account owner who authorised the app. |
| `instagram_business_manage_comments` | Read comments on the owner's own posts/Reels via webhook and post one public reply to a matching comment, e.g. "Check your DM!". |
| `instagram_business_manage_messages` | Send one private reply (DM) per comment, within 7 days, containing the link the commenter asked for by commenting a keyword. No bulk or unsolicited messages. |

## 3. Screencast script (about 2 minutes, one continuous recording)
1. Show the app logged in, Settings → Instagram → Connect; complete the Meta login dialog and show it returns connected.
2. Show a campaign: keyword, public reply, DM text and link.
3. Open Instagram as a different account, comment the keyword on the post.
4. Show the public reply under the comment.
5. Show the DM arriving with the link.
6. Show Activity in AutoDM listing that event.
7. Show Disconnect / data deletion page.

Note: the screencast needs a real working comment to DM flow, which Meta requires you to demonstrate with
an account that has a role on the app while still in Development mode. Reviewers' test accounts are
added by Meta during review; list login-free test steps in the "Notes for reviewer".

## 4. Notes for reviewer
"Log in with Instagram professional account via Facebook Login for Business (Unified Login). Create a
campaign for any post with keyword LINK. Comment LINK from a second account. The app replies publicly
and sends one private reply with the configured link. Credentials: provide a demo admin login in the
review form (never in the repo)."

## 5. Go Live
App dashboard → toggle **App mode** to Live after approval. Then re-run `docs/unified-login-testing.md`
tests 5-10 with an account that has no role on the app.
