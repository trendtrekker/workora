import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path=request.nextUrl.pathname;
  if(process.env.WORKORA_SHOPIFY_DEV_ONLY==='1' && !['/merchant','/api/v1/shopify/onboard','/api/v1/shopify/webhooks','/api/v1/merchant/me'].includes(path) && !path.startsWith('/_next/static/'))return new NextResponse(null,{status:404});
  if(path==='/merchant'){
    const requestHeaders=new Headers(request.headers);
    requestHeaders.set('x-workora-surface','merchant');
    const response=NextResponse.next({request:{headers:requestHeaders}});
    const shop=request.nextUrl.searchParams.get('shop')??'';
    const store=/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)?` https://${shop}`:'';
    response.headers.set('Content-Security-Policy',`frame-ancestors https://admin.shopify.com${store};`);
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('Referrer-Policy','no-referrer');
    return response;
  }
  if (!request.nextUrl.pathname.startsWith('/founder')) return NextResponse.next();
  if (request.nextUrl.pathname === '/founder/sign-in') return NextResponse.next();
  if (!request.cookies.has('workora_founder_session')) return NextResponse.redirect(new URL('/founder/sign-in', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/:path*'] };
