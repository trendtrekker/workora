import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';

export async function GET() { const identity = await getFounderIdentity(); if (!identity) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Founder session required.' } }, { status: 401 }); return NextResponse.json({ data: identity }); }
