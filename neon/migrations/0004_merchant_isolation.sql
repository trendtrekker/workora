BEGIN;
-- Run as the schema owner. A separate LOGIN role must later inherit this role;
-- never grant it founder/runtime membership or BYPASSRLS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='workora_merchant') THEN
    CREATE ROLE workora_merchant NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA workora TO workora_merchant;

CREATE TABLE workora.shop_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text UNIQUE NOT NULL CHECK (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  merchant_id uuid NOT NULL REFERENCES workora.merchants(id),
  verified_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workora.merchant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES workora.shop_installations(id),
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- These identity tables are server-only; no merchant access is granted.
GRANT SELECT ON workora.shop_installations, workora.merchant_sessions TO awah_runtime;

ALTER TABLE workora.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workora.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workora.support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY founder_merchants ON workora.merchants TO awah_runtime USING(true) WITH CHECK(true);
CREATE POLICY founder_subscriptions ON workora.subscriptions TO awah_runtime USING(true) WITH CHECK(true);
CREATE POLICY founder_support ON workora.support_sessions TO awah_runtime USING(true) WITH CHECK(true);
CREATE POLICY merchant_self ON workora.merchants FOR SELECT TO workora_merchant
  USING(id = nullif(current_setting('workora.merchant_id',true),'')::uuid);
CREATE POLICY merchant_subscriptions ON workora.subscriptions FOR SELECT TO workora_merchant
  USING(merchant_id = nullif(current_setting('workora.merchant_id',true),'')::uuid);
CREATE POLICY merchant_support ON workora.support_sessions FOR SELECT TO workora_merchant
  USING(merchant_id = nullif(current_setting('workora.merchant_id',true),'')::uuid);
GRANT SELECT ON workora.merchants,workora.subscriptions,workora.support_sessions TO workora_merchant;
-- NULL merchant IDs (existing demo revenue) match no merchant context.
COMMIT;
