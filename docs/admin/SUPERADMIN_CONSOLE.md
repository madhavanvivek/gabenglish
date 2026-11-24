# Gabenglish Superadmin Console

## What is included

The static, dependency-free console is at `apps/admin-console/index.html`. It uses the existing Superadmin API and provides:

- Provisioned-account sign-in and sign-out.
- Monthly and yearly discount percentage, enable/disable and optional offer-window editing.
- Active administrator session inventory, current-session identification and revocation of other sessions.
- Redacted audit history with action filtering and bounded pagination.
- Aggregate Gabroo speech-usage reporting with daily/monthly buckets, date filters, character/request totals, unique learners and an activity trend. The report never displays learner identities, transcripts or audio.

The console does not provision administrator accounts, display secrets, process payments or grant subscription access. The first Superadmin must be provisioned out-of-band using [the bootstrap runbook](../security/ADMIN_PORTAL_BOOTSTRAP.md).

## Local preview

From the repository root, serve the static file with any local static HTTP server. For example:

```bash
python3 -m http.server 8080 --directory apps/admin-console
```

Open `http://localhost:8080`. To point the console at a separately hosted API, define `window.GABENGLISH_API_BASE` before the console's application script in the HTML:

```html
<script>window.GABENGLISH_API_BASE = "http://localhost:4000";</script>
```

The value is the API origin only, without the `/api/v1` suffix. In production use the approved HTTPS API origin.

## Deployment requirements

- Serve this directory from a dedicated HTTPS origin under the organisation's control.
- Configure the API's `CORS_ORIGINS` to include the exact console origin; do not use a wildcard.
- Set `window.GABENGLISH_API_BASE` to the HTTPS API origin before deployment.
- Keep API credentials, database credentials, signing keys and provider secrets out of this static application.
- Use an organisation-managed password manager for the provisioned Superadmin credential.
- Restrict access at the hosting/network layer where practical, in addition to API authentication.
- Apply a restrictive Content Security Policy appropriate to the chosen host. The current single-file prototype uses inline styles and script; either allow those hashes/nonces or externalise them before enforcing a no-inline policy.
- Do not expose the console over plain HTTP outside localhost.

## Session handling and limitations

The short-lived admin bearer token is held in tab-scoped `sessionStorage`, not persistent local storage. Sign-out attempts to revoke the current server-side session. Closing the tab clears the browser copy but does not revoke the server-side session; it remains valid until expiry or explicit revocation. Administrators should sign out on shared devices.

The API enforces a 30-minute inactivity timeout for administrator sessions. Every successful authenticated admin API request refreshes the server-side activity timestamp; an idle session is rejected even if its browser tab remains open, and it disappears from the active-session inventory. This is enforced in PostgreSQL-backed session checks rather than relying on a browser timer. The console currently has no MFA, password recovery, invitation flow, audit export, or role delegation. These remain outstanding security/release items. No payment provider is selected, and this console does not initiate checkout or change learner entitlements.

## Manual acceptance checklist

1. Sign in with an active, provisioned Superadmin; invalid credentials show a generic failure.
2. Verify both approved plans appear and the standard prices remain read-only.
3. Save a discount and confirm the API returns success and the audit event appears.
4. Configure invalid offer dates and verify the API rejects them.
5. Open the session list, identify the current session, revoke a second session and verify that token is rejected on its next API call.
6. Filter audit history by `admin.session.revoked` and `subscription.offer.updated`.
7. Open Gabroo speech usage, switch between daily and monthly buckets, apply a valid date range and verify totals/series load.
8. Confirm the unique-learner total is distinct across the selected range and is not confused with active learner buckets.
9. Sign out and verify the current token is revoked.
10. Confirm a learner token and a non-Superadmin account cannot access these endpoints.
