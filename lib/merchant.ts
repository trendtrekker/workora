import {neon} from '@neondatabase/serverless';
import {getNeon} from './neon';
import {verifyShopifyIdentity} from './shopify-identity';

// No caller-provided merchant ID is accepted. Only a verified Shopify identity linked
// to an active, verified installation can choose the database tenant context.
export async function getMerchantOverview(authorization: string | null) {
  const verified=await verifyShopifyIdentity(authorization);
  if(!verified) return null;
  // A valid Shopify identity cannot create or reactivate an installation.
  // Onboarding must verify installation independently before adding this mapping.
  const identity=await getNeon()`select i.merchant_id from workora.shop_installations i
    join workora.merchants m on m.id=i.merchant_id
    join workora.shop_memberships u on u.installation_id=i.id
    where i.shop_domain=${verified.shop}
      and u.shopify_user_id=${verified.userId} and u.revoked_at is null
      and i.revoked_at is null and i.verified_at<=now() and m.status='active' limit 1`;
  if(!identity[0]) return null;
  const url=process.env.MERCHANT_DATABASE_URL;
  if(!url) throw new Error('Merchant database connection is not configured');
  const sql=neon(url);
  const roles=await sql`select rolsuper,rolbypassrls,
    pg_has_role(current_user,'awah_runtime','MEMBER') as founder_role,
    pg_has_role(current_user,'workora_merchant','MEMBER') as merchant_role,
    exists(select 1 from pg_class where relnamespace='workora'::regnamespace
      and relowner=(select oid from pg_roles where rolname=current_user)) as owns_tables
    from pg_roles where rolname=current_user`;
  const role=roles[0];
  if(!role || role.rolsuper || role.rolbypassrls || role.founder_role || role.owns_tables || !role.merchant_role)
    throw new Error('Merchant database role is not isolated');
  // SET LOCAL and the read share one transaction: pooled connections cannot
  // retain the tenant setting after commit or rollback.
  const results=await sql.transaction([
    sql`select set_config('workora.merchant_id',${identity[0].merchant_id},true)`,
    sql`select id,name,status from workora.merchants where id=${identity[0].merchant_id}`
  ]);
  return results[1][0] ?? null;
}
