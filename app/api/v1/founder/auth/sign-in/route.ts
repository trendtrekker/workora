import { NextResponse } from 'next/server';
import { derivePasswordHash } from '@/lib/auth';
import { getNeon } from '@/lib/neon';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const email = String(body.email ?? '').trim().toLowerCase(); const password = String(body.password ?? '');
  if (!email || !password) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } }, { status: 400 });
  const db = getNeon(); const rows = await db`select id, password_hash, password_salt, mfa_secret from workora.internal_users where lower(email)=${email} and status='active' limit 1`; const user = rows[0];
  if (!user || (await derivePasswordHash(password, String(user.password_salt))) !== String(user.password_hash)) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials.' } }, { status: 401 });
  const challenge = crypto.randomUUID(); await db`insert into workora.mfa_challenges (id,user_id,expires_at) values (${challenge},${user.id},now()+interval '5 minutes')`;
  return NextResponse.json({ data: { challengeId: challenge, mfaRequired: true, expiresAt: new Date(Date.now() + 300000).toISOString() } });
}
