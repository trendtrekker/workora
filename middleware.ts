import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/founder')) return NextResponse.next();
  if (request.nextUrl.pathname === '/founder/sign-in') return NextResponse.next();
  if (!request.cookies.has('workora_founder_session')) return NextResponse.redirect(new URL('/founder/sign-in', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/founder/:path*', '/api/v1/founder/:path*'] };
