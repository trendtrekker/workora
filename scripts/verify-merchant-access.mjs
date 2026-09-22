import {neon} from '@neondatabase/serverless';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const url=new URL(process.env.STAGING_DATABASE_URL);
assert.equal(url.hostname,'ep-sparkling-voice-aeucpah2-pooler.c-2.us-east-2.aws.neon.tech');
const db=neon(url.toString());
const saved=readFileSync('.env.merchant-staging-20260922.local','utf8').trim();
const merchantUrl=saved.slice(saved.indexOf('=')+1);
assert.equal(new URL(merchantUrl).hostname,url.hostname);
const secret=randomBytes(32).toString('hex');
const ids=[randomUUID(),randomUUID()];
const shops=ids.map(id=>`workora-test-${id}.myshopify.com`);
const port=3217,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
  env:{...process.env,DATABASE_URL:url.toString(),MERCHANT_DATABASE_URL:merchantUrl,SHOPIFY_API_KEY:'workora-integration-test',SHOPIFY_API_SECRET:secret,SHOPIFY_APP_URL:origin},stdio:['ignore','pipe','pipe']});
let serverOutput='';
server.stdout.on('data',data=>{serverOutput+=data;});
server.stderr.on('data',data=>{serverOutput+=data;});
function token(shop,user='123'){
  const now=Math.floor(Date.now()/1000);
  const parts=[{alg:'HS256',typ:'JWT'},{aud:'workora-integration-test',iss:`https://${shop}/admin`,dest:`https://${shop}`,sub:user,iat:now,nbf:now-1,exp:now+60}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return `Bearer ${parts}.${createHmac('sha256',secret).update(parts).digest('base64url')}`;
}
async function request(headers={}){return fetch(`${origin}/api/v1/merchant/me`,{headers});}
try{
  let ready=false;
  for(let i=0;i<60;i++){
    assert.equal(server.exitCode,null,'Test server exited before readiness');
    if(serverOutput.includes('Ready in')){ready=true;break;}
    await new Promise(r=>setTimeout(r,500));
  }
  assert(ready,'Test server did not become ready');
  for(let i=0;i<2;i++) await db.transaction([
    db`insert into workora.merchants(id,name,status) values(${ids[i]},${`AUTH TEST ${i}`},'active')`,
    db`insert into workora.shop_installations(shop_domain,merchant_id,verified_at) values(${shops[i]},${ids[i]},now())`,
    db`insert into workora.shop_memberships(installation_id,shopify_user_id,role) select id,'123','owner' from workora.shop_installations where merchant_id=${ids[i]}`
  ]);
  for(const headers of [{},{Cookie:'workora_founder_session=invalid; workora_merchant_session=invalid'},{Authorization:'Bearer invalid'}]){
    const response=await request(headers);assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
  }
  for(let i=0;i<2;i++){
    const response=await request({Authorization:token(shops[i]),'x-merchant-id':ids[1-i]});
    assert.equal(response.status,200);assert.equal((await response.json()).data.id,ids[i]);
  }
  assert.equal((await request({Authorization:token('unmapped-test.myshopify.com')})).status,401);
  assert.equal((await request({Authorization:token(shops[0],'999')})).status,401);
  assert.equal((await fetch(`${origin}/api/v1/shopify/onboard`,{method:'POST',headers:{Authorization:'Bearer invalid'}})).status,401);
  const signedBody=JSON.stringify({id:90001,myshopify_domain:shops[0]});
  const hmac=createHmac('sha256',secret).update(signedBody).digest('base64');
  const webhookHeaders={'x-shopify-hmac-sha256':hmac,'x-shopify-shop-domain':shops[1],'x-shopify-topic':'app/uninstalled','x-shopify-event-id':randomUUID(),'x-shopify-triggered-at':new Date().toISOString()};
  assert.equal((await fetch(`${origin}/api/v1/shopify/webhooks`,{method:'POST',headers:webhookHeaders,body:signedBody})).status,400,'Signed payload cannot revoke a different shop');
  assert.equal((await fetch(`${origin}/api/v1/shopify/webhooks`,{method:'POST',headers:webhookHeaders,body:'{}'})).status,401,'Tampered webhook rejected');
  await db`update workora.shop_installations set revoked_at=now() where merchant_id=${ids[0]}`;
  assert.equal((await request({Authorization:token(shops[0])})).status,401);
  console.log('PASS: merchant API rejects missing/invalid tokens and cookies; isolates A/B despite caller tenant header; rejects unmapped and revoked installations');
}finally{
  server.kill();
  await db.transaction([
    db`delete from workora.shop_memberships where installation_id in (select id from workora.shop_installations where merchant_id in (${ids[0]},${ids[1]}))`,
    db`delete from workora.shop_installations where merchant_id in (${ids[0]},${ids[1]})`,
    db`delete from workora.merchants where id in (${ids[0]},${ids[1]})`
  ]);
}
