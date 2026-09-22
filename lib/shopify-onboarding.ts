import {RequestedTokenType} from '@shopify/shopify-api';
import {getShopify,verifyShopifyIdentity} from './shopify-identity';
import {getNeon} from './neon';

export class OnboardingError extends Error {
  constructor(public code:string, public status:number){super(code);}
}

export async function onboardShop(authorization:string|null){
  const identity=await verifyShopifyIdentity(authorization);
  if(!identity) throw new OnboardingError('UNAUTHENTICATED',401);
  const shopify=getShopify();
  const {session}=await shopify.auth.tokenExchange({shop:identity.shop,sessionToken:authorization!.slice(7),requestedTokenType:RequestedTokenType.OnlineAccessToken}).catch(()=>{throw new OnboardingError('TOKEN_EXCHANGE_FAILED',503);});
  const user=session.onlineAccessInfo?.associated_user;
  if(!session.accessToken || !user || String(user.id)!==identity.userId || !user.account_owner)
    throw new OnboardingError('OWNER_REQUIRED',403);
  const client=new shopify.clients.Graphql({session});
  const result=await client.request<{shop:{id:string;name:string;myshopifyDomain:string};currentAppInstallation:{id:string}}>(
    '{ shop { id name myshopifyDomain } currentAppInstallation { id } }').catch(()=>{throw new OnboardingError('SHOP_LOOKUP_FAILED',503);});
  const data=result.data;
  if(result.errors || !data || data.shop.myshopifyDomain!==identity.shop || !data.currentAppInstallation?.id)
    throw new OnboardingError('INSTALLATION_UNVERIFIED',403);
  const webhookUri=new URL('/api/v1/shopify/webhooks',process.env.SHOPIFY_APP_URL).toString();
  const hooks=await client.request<{webhookSubscriptions:{nodes:{id:string;uri:string}[]}}>(
    '{ webhookSubscriptions(first:100,topics:APP_UNINSTALLED) { nodes { id uri } } }').catch(()=>{throw new OnboardingError('WEBHOOK_LOOKUP_FAILED',503);});
  if(hooks.errors||!hooks.data)throw new OnboardingError('WEBHOOK_UNAVAILABLE',503);
  if(!hooks.data.webhookSubscriptions.nodes.some(hook=>hook.uri===webhookUri)){
    const created=await client.request<{webhookSubscriptionCreate:{webhookSubscription:{id:string}|null;userErrors:{message:string}[]}}>(
      'mutation RegisterUninstall($uri:String!){webhookSubscriptionCreate(topic:APP_UNINSTALLED,webhookSubscription:{uri:$uri,format:JSON}){webhookSubscription{id} userErrors{message}}}',{variables:{uri:webhookUri}}).catch(()=>{throw new OnboardingError('WEBHOOK_CREATE_FAILED',503);});
    if(created.errors||!created.data?.webhookSubscriptionCreate.webhookSubscription||created.data.webhookSubscriptionCreate.userErrors.length)
      throw new OnboardingError('WEBHOOK_UNAVAILABLE',503);
  }
  // Access tokens stay in memory for this request; they are not returned or stored.
  const rows=await getNeon()`select workora.onboard_shop(${identity.shop},${data.shop.id},${data.currentAppInstallation.id},${data.shop.name},${identity.userId}) as id`.catch(()=>{throw new OnboardingError('BUSINESS_SETUP_FAILED',503);});
  return {id:rows[0].id,name:data.shop.name,shop:identity.shop,role:'owner'};
}
