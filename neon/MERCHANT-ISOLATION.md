# Merchant isolation rollout

This foundation does not implement Shopify OAuth or issue merchant sessions.
No merchant session may be issued until a Shopify installation has been
verified by the server. Founder cookies are never accepted for merchant access.

1. Apply `0004_merchant_isolation.sql` once as the database owner, in staging first.
2. Provision a separate LOGIN with NOINHERITED founder privileges, NOSUPERUSER,
   NOBYPASSRLS, and membership only in `workora_merchant`. It must not own tables.
3. Save its pooled URL as `MERCHANT_DATABASE_URL`. Never reuse DATABASE_URL.
4. Test tenant A and tenant B in isolated fixtures: each context sees only its
   own merchants, subscriptions and support sessions. With no context, all three
   tables must return no rows. NULL-linked subscriptions must remain invisible.
5. Verify merchant-role writes and access to internal_users, sessions,
   merchant_sessions, shop_installations and audit_events are denied.
6. Implement verified Shopify installation and session issuance before enabling
   merchant onboarding. Installation revocation invalidates linked sessions.

RLS protects queries from missing tenant filters, not a compromised server or
database credential: only trusted server code may set the transaction context.
Founder cross-business access remains subject to existing application permissions.
