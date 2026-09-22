import '@shopify/shopify-api/adapters/node';
import {shopifyApi, ApiVersion} from '@shopify/shopify-api';

export function getShopify() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecretKey = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!apiKey || !apiSecretKey || !appUrl) throw new Error('Shopify authentication is not configured');
  return shopifyApi({apiKey, apiSecretKey, hostName: new URL(appUrl).host,
    apiVersion: ApiVersion.July26, isEmbeddedApp: true,
    // Library JWT errors can contain tokens. Never send them to logs.
    logger: {log: () => {}}});
}

export async function verifyShopifyIdentity(authorization: string | null) {
  if (!authorization || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization) || authorization.length > 8192) return null;
  const shopify = getShopify();
  try {
    const claims = await shopify.session.decodeSessionToken(authorization.slice(7));
    const now = Math.floor(Date.now() / 1000);
    if (![claims.exp, claims.nbf, claims.iat].every(Number.isSafeInteger) ||
        claims.exp <= now || claims.nbf > now || claims.iat > now || claims.exp <= claims.iat ||
        typeof claims.sub !== 'string' || !/^\d+$/.test(claims.sub)) return null;
    if (typeof claims.dest !== 'string' || !/^https:\/\/[a-z0-9][a-z0-9-]*\.myshopify\.com\/?$/.test(claims.dest)) return null;
    const shop = new URL(claims.dest).hostname;
    if (claims.iss !== `https://${shop}/admin`) return null;
    return {shop, userId: claims.sub};
  } catch {
    return null;
  }
}
