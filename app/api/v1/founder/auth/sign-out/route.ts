import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { founderSessionCookie } from '@/lib/auth';

export async function POST() { const response = NextResponse.json({ data: { signedOut: true } }); response.cookies.set(founderSessionCookie, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 }); return response; }
