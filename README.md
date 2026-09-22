# Workora

Standalone Workora application scaffold. 

Current verified state and remaining Shopify integration work: [September 22 staging report](neon/STAGING-2026-09-22.md).

Shopify development setup and current sign-in validation: [Shopify development](SHOPIFY-DEVELOPMENT.md).

Merchant `/api/v1/merchant/me` requests require a fresh Shopify App Bridge bearer token and an existing verified, active shop installation. Founder and legacy merchant cookies are not accepted. Set `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, and an isolated `MERCHANT_DATABASE_URL` before enabling merchant access. Missing configuration fails closed.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to the Workora Neon database.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

The Neon migration and founder API contracts live in the parent `workora/` planning directory until this repository is connected to its remote GitHub repository.
