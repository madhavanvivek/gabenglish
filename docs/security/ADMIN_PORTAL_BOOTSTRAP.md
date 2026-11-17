# Gabenglish Admin Portal Bootstrap and Security

## Scope

The initial admin API is a separate authentication boundary from learner accounts. It currently exposes Superadmin subscription-offer management only. Admin access uses a separate admin_sessions table and tokens with the gabenglish-admin issuer and gabenglish-console audience; learner tokens cannot authenticate to admin endpoints.

## One-time Superadmin provisioning

Migration 0018_admin_subscription_controls.sql creates the superadmin role and admin session storage. It deliberately creates no administrator account, password or default credential.

Provision the first Superadmin through a trusted database operator session after applying migrations:

1. Generate a password hash on a trusted machine. Do not put the plaintext password in source control, shell history, a ticket or a chat.

   \`\`\`bash
   read -s ADMIN_PASSWORD
   export ADMIN_PASSWORD
   node -e 'const {randomBytes,scryptSync}=require("node:crypto"); const salt=randomBytes(16); const hash=scryptSync(process.env.ADMIN_PASSWORD,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}); process.stdout.write("scrypt$16384$8$1$"+salt.toString("base64url")+"$"+hash.toString("base64url")+"\\n")'
   unset ADMIN_PASSWORD
   \`\`\`

2. Insert the normalized email and generated hash using a parameterized database client. Set status to active.
3. Assign the superadmin role by joining admin_roles.code = 'superadmin' to the new account ID.
4. Verify that the account can sign in, then store credentials in the organisation's approved password manager.

Never seed a default password, make an unauthenticated bootstrap endpoint, or expose a password hash in an API response.

## Implemented controls

- Admin accounts are separate from learner users and refresh sessions.
- Password verification supports the repository's scrypt encoding (scrypt$16384$8$1$...).
- Admin sign-in is limited to active accounts with the superadmin role.
- Failed sign-in attempts are counted; five or more failures lock the account for 15 minutes.
- Admin tokens use a distinct issuer/audience and are checked against revocable, expiring database sessions.
- Superadmin role membership is re-read from the database for every protected request.
- Offer changes are transactional and produce redacted audit events.
- Offer versions increment in PostgreSQL on every update.
- The API accepts only the monthly and yearly plan codes and discount basis points from 0 to 9999. Standard prices remain fixed at ₹99 and ₹1,188.
- Offer start/end timestamps are nullable; when both exist, end must be later than start.
- No payment provider is configured. Changing an offer does not collect money or grant access.

## Current endpoints

- POST /api/v1/admin/auth/login
- POST /api/v1/admin/auth/logout
- GET /api/v1/admin/subscription-offers
- GET /api/v1/admin/audit-events (redacted, paginated, filterable by action)
- PUT /api/v1/admin/subscription-offers/{monthly|yearly}

Send the admin access token as Authorization: Bearer <token>. The token is not a learner token and must not be stored in learner session storage.

## Remaining admin release work

- Admin web UI, MFA, recovery and account invitation lifecycle.
- Role delegation and least-privilege roles beyond the initial Superadmin.
- Security review, penetration testing, lockout monitoring and alerting.
- Audit-log export and admin session management UI.
- Payment provider setup and verified webhook processing remain separate gates.
