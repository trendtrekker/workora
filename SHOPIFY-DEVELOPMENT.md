# Workora Shopify development

## Configured resources

- Organization: Afro logics Ltd (`235134926`).
- App: Workora (`426370138113`), client ID `f3238ae1bb1b19741d1e7d272d1fc052`.
- Development store: `workora-development.myshopify.com`, free Basic development plan.
- Released configuration: `workora-staging-auth`.
- App URL: `https://deviation-wanted-promotions-pricing.trycloudflare.com/merchant`.
- Neon staging: `br-sparkling-bread-aegamifv` in `proud-violet-01051839`.

The HTTPS URL is a temporary Cloudflare development tunnel. It works only while the local server and tunnel are running; it is not production hosting. A replacement tunnel URL must be saved in Shopify and `.env.shopify.local` before use.

## Credentials and startup

The existing Shopify client secret was transferred through a one-shot loopback-only form into ignored `.env.shopify.local`, without printing it. Do not commit this file or display its contents. The form server closed after saving.

`node scripts/start-shopify-staging.mjs` starts the built app on `127.0.0.1:3218`, loads the Shopify settings and isolated merchant role, and uses the existing `awah_runtime` login only against the staging endpoint. It refuses an unexpected endpoint or runtime role. The staging-only route guard hides founder pages and APIs.

The Cloudflare command is `.tools/cloudflared.exe tunnel --url http://127.0.0.1:3218 --no-autoupdate`.

## Authentication and onboarding

1. Shopify App Bridge obtains a fresh ID token in the embedded merchant page.
2. The server validates its signature, audience, timing, destination and issuer.
3. Shopify online token exchange confirms the current user. Only the store owner can complete this initial onboarding flow.
4. The Admin API verifies the shop and current app installation. An uninstall webhook is registered before the business is provisioned.
5. A transaction with a per-shop lock creates or reuses the business and owner membership. Repeat sign-in and reinstall preserve the merchant ID.
6. Merchant API access requires the verified shop, active installation, active merchant and active Shopify-user membership. Merchant reads run with transaction-local tenant context under the restricted role.

Access tokens exist only in request memory. No Shopify access token is saved to the database or returned to the browser. Worker/customer login and merchant staff invitations remain separate future work.

The uninstall handler verifies HMAC against raw request bytes, binds the signed shop identity to its installation, deduplicates event IDs and revokes installation/memberships/sessions. Delayed uninstall events predating a verified reinstall are ignored.

## Validation

- Build and TypeScript validation: passed.
- Synthetic ID-token validation: passed.
- Staging onboarding lifecycle tests: passed, including concurrent creation, repeated sign-in, shop-ID binding, revocation, duplicate/delayed events, reinstall, revoked prior owner and restricted-role access.
- Built HTTP merchant tests: passed, including unrelated-user rejection and cross-shop/tampered webhook rejection.
- Staging-only exposure: merchant page returns 200; founder page and founder API return 404; unauthenticated merchant API returns 401.
- Public HTTPS page returns 200 with App Bridge present.
- Live Shopify installation and browser sign-in: awaiting final store consent and verification.

Tests use disposable, explicitly named staging fixtures. Production database was not modified.
