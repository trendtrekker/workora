import {neon} from '@neondatabase/serverless';
import {randomUUID,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {validShopifyWebhook} from '../lib/shopify-webhook.ts';
const url=new URL(process.env.STAGING_DATABASE_URL);
assert.equal(url.hostname,'ep-sparkling-voice-aeucpah2-pooler.c-2.us-east-2.aws.neon.tech');
const admin=neon(url.toString());
const runtime=new URL(parseEnv(readFileSync('.env.local','utf8')).DATABASE_URL);runtime.hostname=url.hostname;
assert.equal(runtime.username,'awah_runtime');
const db=neon(runtime.toString());
const shop=`onboard-test-${randomUUID()}.myshopify.com`,shopId='gid://shopify/Shop/90001',installation='gid://shopify/AppInstallation/90001';
let id;
try{
  const results=await Promise.all([1,2].map(()=>db`select workora.onboard_shop(${shop},${shopId},${installation},'ONBOARD TEST','123') as id`));
  id=results[0][0].id;assert.equal(id,results[1][0].id);
  assert.equal((await admin`select count(*)::int as n from workora.shop_installations where shop_domain=${shop}`)[0].n,1);
  const initial=(await admin`select verified_at from workora.shop_installations where shop_domain=${shop}`)[0].verified_at;
  await db`select workora.onboard_shop(${shop},${shopId},${installation},'ONBOARD TEST','123')`;
  assert.equal(String((await admin`select verified_at from workora.shop_installations where shop_domain=${shop}`)[0].verified_at),String(initial));
  await assert.rejects(()=>db`select workora.onboard_shop(${shop},'gid://shopify/Shop/99999',${installation},'WRONG SHOP','123')`);
  const event=randomUUID();const when=new Date(Date.now()+1000).toISOString();
  await db`select workora.revoke_shop(${shop},${event},${when}::timestamptz)`;
  assert((await admin`select revoked_at from workora.shop_installations where shop_domain=${shop}`)[0].revoked_at);
  assert((await admin`select revoked_at from workora.shop_memberships where installation_id=(select id from workora.shop_installations where shop_domain=${shop})`)[0].revoked_at);
  const reinstall=await db`select workora.onboard_shop(${shop},${shopId},'gid://shopify/AppInstallation/90002','ONBOARD TEST','456') as id`;
  assert.equal(reinstall[0].id,id);
  await db`select workora.revoke_shop(${shop},${event},${when}::timestamptz)`;
  await db`select workora.revoke_shop(${shop},${randomUUID()},'2000-01-01'::timestamptz)`;
  assert.equal((await admin`select revoked_at from workora.shop_installations where shop_domain=${shop}`)[0].revoked_at,null);
  const members=await admin`select shopify_user_id,revoked_at from workora.shop_memberships where installation_id=(select id from workora.shop_installations where shop_domain=${shop})`;
  assert(members.find(x=>x.shopify_user_id==='123').revoked_at);assert.equal(members.find(x=>x.shopify_user_id==='456').revoked_at,null);
  const merchant=neon(parseEnv(readFileSync('.env.merchant-staging-20260922.local','utf8')).MERCHANT_DATABASE_URL);
  await assert.rejects(()=>merchant`select workora.onboard_shop(${shop},${shopId},${installation},'NO ACCESS','123')`);
  await assert.rejects(()=>merchant`select * from workora.shop_memberships`);
  const body=Buffer.from('{"id":90001}'),secret='synthetic-test-secret';
  const hmac=createHmac('sha256',secret).update(body).digest('base64');
  assert(validShopifyWebhook(body,hmac,secret));assert(!validShopifyWebhook(Buffer.from('{}'),hmac,secret));assert(!validShopifyWebhook(body,hmac,'wrong'));assert(!validShopifyWebhook(body,null,secret));
  console.log('PASS: concurrent onboarding, repeat login, shop-ID binding, uninstall, duplicate/delayed events, reinstall without duplicate merchant, revoked old owner, restricted role, webhook signatures');
}finally{
  await admin.transaction([
    admin`delete from workora.shop_memberships where installation_id in (select id from workora.shop_installations where shop_domain=${shop})`,
    admin`delete from workora.shopify_webhook_events where shop_domain=${shop}`,
    admin`delete from workora.shop_installations where shop_domain=${shop}`,
    admin`delete from workora.merchants where id=${id??'00000000-0000-0000-0000-000000000000'}`
  ]);
}
