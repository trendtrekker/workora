import {createHmac,timingSafeEqual} from 'node:crypto';
export function validShopifyWebhook(body:Buffer,hmac:string|null,secret:string){
  if(!hmac || !/^[A-Za-z0-9+/]{43}=$/.test(hmac)) return false;
  const expected=createHmac('sha256',secret).update(body).digest();
  const actual=Buffer.from(hmac,'base64');
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
