BEGIN;
ALTER TABLE workora.shop_installations ADD COLUMN shopify_shop_id text;
ALTER TABLE workora.shop_installations ADD COLUMN shopify_installation_id text;
CREATE TABLE workora.shop_memberships (
  installation_id uuid NOT NULL REFERENCES workora.shop_installations(id),
  shopify_user_id text NOT NULL CHECK(shopify_user_id ~ '^[0-9]+$'),
  role text NOT NULL CHECK(role='owner'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(installation_id,shopify_user_id)
);
GRANT SELECT ON workora.shop_memberships TO awah_runtime;
CREATE TABLE workora.shopify_webhook_events (
  event_id text PRIMARY KEY,
  shop_domain text NOT NULL,
  topic text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Only trusted server code calls this after online token exchange, owner
-- verification and a successful Shopify Admin API installation query.
CREATE FUNCTION workora.onboard_shop(p_shop text,p_shop_id text,p_installation_id text,p_name text,p_user text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,workora AS $$
DECLARE existing workora.shop_installations%ROWTYPE; merchant uuid;
BEGIN
  IF p_shop !~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$' OR p_user !~ '^[0-9]+$'
    OR p_shop_id !~ '^gid://shopify/Shop/[0-9]+$' OR p_installation_id !~ '^gid://shopify/AppInstallation/[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid installation identity';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_shop,0));
  SELECT * INTO existing FROM workora.shop_installations WHERE shop_domain=p_shop FOR UPDATE;
  IF FOUND THEN
    IF existing.shopify_shop_id IS NOT NULL AND existing.shopify_shop_id<>p_shop_id THEN RAISE EXCEPTION 'Shop identity changed'; END IF;
    merchant:=existing.merchant_id;
    IF NOT EXISTS(SELECT 1 FROM workora.merchants WHERE id=merchant AND status='active') THEN RAISE EXCEPTION 'Merchant unavailable'; END IF;
    IF existing.shopify_installation_id IS DISTINCT FROM p_installation_id THEN
      UPDATE workora.shop_memberships SET revoked_at=now() WHERE installation_id=existing.id;
    END IF;
    UPDATE workora.shop_installations SET verified_at=CASE WHEN revoked_at IS NOT NULL OR shopify_installation_id IS DISTINCT FROM p_installation_id THEN now() ELSE verified_at END,revoked_at=NULL,shopify_shop_id=p_shop_id,shopify_installation_id=p_installation_id WHERE id=existing.id;
  ELSE
    INSERT INTO workora.merchants(name,status) VALUES(left(p_name,200),'active') RETURNING id INTO merchant;
    INSERT INTO workora.shop_installations(shop_domain,merchant_id,verified_at,shopify_shop_id,shopify_installation_id)
      VALUES(p_shop,merchant,now(),p_shop_id,p_installation_id) RETURNING * INTO existing;
  END IF;
  INSERT INTO workora.shop_memberships(installation_id,shopify_user_id,role) VALUES(existing.id,p_user,'owner')
    ON CONFLICT(installation_id,shopify_user_id) DO UPDATE SET revoked_at=NULL;
  RETURN merchant;
END $$;
REVOKE ALL ON FUNCTION workora.onboard_shop(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION workora.onboard_shop(text,text,text,text,text) TO awah_runtime;

CREATE FUNCTION workora.revoke_shop(p_shop text,p_event text,p_triggered_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,workora AS $$
DECLARE installation uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_shop,0));
  INSERT INTO workora.shopify_webhook_events(event_id,shop_domain,topic) VALUES(p_event,p_shop,'app/uninstalled') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  -- Delayed uninstall delivery must not revoke a newer verified reinstall.
  UPDATE workora.shop_installations SET revoked_at=now() WHERE shop_domain=p_shop AND verified_at<=p_triggered_at RETURNING id INTO installation;
  IF installation IS NOT NULL THEN
    UPDATE workora.shop_memberships SET revoked_at=now() WHERE installation_id=installation;
    UPDATE workora.merchant_sessions SET revoked_at=now() WHERE installation_id=installation;
  END IF;
END $$;
REVOKE ALL ON FUNCTION workora.revoke_shop(text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION workora.revoke_shop(text,text,timestamptz) TO awah_runtime;
COMMIT;
