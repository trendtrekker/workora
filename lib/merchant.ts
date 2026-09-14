import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {neon} from '@neondatabase/serverless';
import {getNeon} from './neon';

// No caller-provided merchant ID is accepted. Only a server-side session linked
// to an active, verified installation can choose the database tenant context.
export async function getMerchantOverview() {
  const token=(await cookies()).get('workora_merchant_session')?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hash=createHash('sha256').update(token).digest('hex');
  const identity=await getNeon()`select i.merchant_id from workora.merchant_sessions s
    join workora.shop_installations i on i.id=s.installation_id
    join workora.merchants m on m.id=i.merchant_id
    where s.token_hash=${hash} and s.revoked_at is null and s.expires_at>now()
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
