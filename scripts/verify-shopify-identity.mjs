import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyShopifyIdentity} from '../lib/shopify-identity.ts';

// Synthetic credentials only. No network or real merchant data is used.
process.env.SHOPIFY_API_KEY='test-client';
process.env.SHOPIFY_API_SECRET='test-secret';
process.env.SHOPIFY_APP_URL='https://workora.example';
const now=Math.floor(Date.now()/1000);
const base={aud:'test-client',iss:'https://test-shop.myshopify.com/admin',dest:'https://test-shop.myshopify.com',sub:'123',iat:now,nbf:now-1,exp:now+60};
function sign(payload,secret='test-secret',alg='HS256'){
  const input=[{alg,typ:'JWT'},payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return `Bearer ${input}.${createHmac('sha256',secret).update(input).digest('base64url')}`;
}
assert.deepEqual(await verifyShopifyIdentity(sign(base)),{shop:'test-shop.myshopify.com',userId:'123'});
for(const patch of [{aud:'another-app'},{exp:now-1},{nbf:now+60},{iat:now+60},{exp:undefined},{nbf:undefined},{sub:undefined},{dest:'https://attacker.example'},{dest:'https://test-shop.myshopify.com.attacker.example'},{dest:'https://test-shop.myshopify.com/path'},{iss:'https://other-shop.myshopify.com/admin'}]){
  assert.equal(await verifyShopifyIdentity(sign({...base,...patch})),null,JSON.stringify(patch));
}
assert.equal(await verifyShopifyIdentity(sign(base,'wrong-secret')),null);
assert.equal(await verifyShopifyIdentity(sign(base,'test-secret','none')),null);
for(const header of [null,'','Bearer bad','Basic abc']) assert.equal(await verifyShopifyIdentity(header),null);
delete process.env.SHOPIFY_API_SECRET;
await assert.rejects(()=>verifyShopifyIdentity(sign(base)),/not configured/);
console.log('PASS: valid identity, forged signature, algorithm, audience, time, domain, issuer, missing claims and missing configuration');
