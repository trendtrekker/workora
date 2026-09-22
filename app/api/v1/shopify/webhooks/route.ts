import {NextResponse} from 'next/server';
import {validShopifyWebhook} from '@/lib/shopify-webhook';
import {getNeon} from '@/lib/neon';
export const runtime='nodejs';
export async function POST(request:Request){
  const secret=process.env.SHOPIFY_API_SECRET;
  if(!secret) return new NextResponse(null,{status:503});
  const reader=request.body?.getReader();
  if(!reader) return new NextResponse(null,{status:400});
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1048576){await reader.cancel();return new NextResponse(null,{status:413});}chunks.push(value);}
  const body=Buffer.concat(chunks);
  if(!validShopifyWebhook(body,request.headers.get('x-shopify-hmac-sha256'),secret))return new NextResponse(null,{status:401});
  const shop=request.headers.get('x-shopify-shop-domain')??'';
  const event=request.headers.get('x-shopify-event-id')??request.headers.get('x-shopify-webhook-id')??'';
  const triggered=request.headers.get('x-shopify-triggered-at')??'';
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)||!event||event.length>200||!Number.isFinite(Date.parse(triggered)))return new NextResponse(null,{status:400});
  if(request.headers.get('x-shopify-topic')!=='app/uninstalled')return new NextResponse(null,{status:400});
  let payload:{id?:unknown;myshopify_domain?:unknown};
  try{payload=JSON.parse(body.toString('utf8'));}catch{return new NextResponse(null,{status:400});}
  // HMAC covers the body, not the routing headers. Bind the signed shop
  // identity to the installation so another shop's payload cannot revoke it.
  if(!payload||payload.myshopify_domain!==shop||!/^\d+$/.test(String(payload.id)))return new NextResponse(null,{status:400});
  const shopId=`gid://shopify/Shop/${payload.id}`;
  try{await getNeon()`select workora.revoke_shop(${shop},${event},${triggered}::timestamptz) from workora.shop_installations where shop_domain=${shop} and shopify_shop_id=${shopId}`;return new NextResponse(null,{status:200});}
  catch{return new NextResponse(null,{status:503});}
}
