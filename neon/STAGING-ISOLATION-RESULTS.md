# Staging isolation verification — 2026-09-14

Branch: `workora-staging` (`br-noisy-fog-aeb5tec0`). Production was not modified.

- Applied migration 0004 on staging.
- Created `workora_merchant_staging` LOGIN, inheriting only `workora_merchant`.
- Verified no superuser, BYPASSRLS, role-creation, database-creation or founder membership.
- Created explicitly labeled ISOLATION TEST A and B fixtures in staging.
- Both tenants read only their own merchant, subscription and support records.
- Missing context after pooled transactions returns zero rows, including legacy NULL-linked revenue.
- Direct reads of founder users, founder sessions, merchant sessions, installation mappings and audit events denied.
- Updates to merchant-facing tables denied.

Credential file: `.env.merchant-staging.local` (ignored by Git).
Run checks with `node --env-file=.env.staging.local scripts/verify-staging-isolation.mjs`.

Neon displayed branch expiration September 15, 2026 at 08:17 Lagos time.
This verifies database isolation, not Shopify identity verification or end-to-end
merchant authentication. Those flows remain unimplemented and no merchant
session has been issued by this test.
