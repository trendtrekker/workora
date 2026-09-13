import { NextResponse } from 'next/server';
import { createSession, verifyTotp, founderSessionCookie } from '@/lib/auth';
import { getNeon } from '@/lib/neon';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const challengeId = String(body.challengeId ?? ''); const code = String(body.code ?? '');
  if (!challengeId || !/^\d{6}$/.test(code)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'A challenge and six-digit code are required.' } }, { status: 400 });
  const db = getNeon(); const rows = await db`select c.user_id, u.email, u.display_name, u.mfa_secret from workora.mfa_challenges c join workora.internal_users u on u.id=c.user_id where c.id=${challengeId} and c.used_at is null and c.expires_at>now() and u.status='active' limit 1`; const row = rows[0];
  if (!row || !(await verifyTotp(String(row.mfa_secret), code))) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired MFA code.' } }, { status: 401 });
  const session = await createSession(String(row.user_id), String(body.deviceName ?? 'Unknown device')); await db`update workora.mfa_challenges set used_at=now() where id=${challengeId}`;
  const response = NextResponse.json({ data: { user: { id: String(row.user_id), email: String(row.email), displayName: String(row.display_name) }, session: { id: session.id, expiresAt: session.expiresAt }, redirect: '/founder' } }); response.cookies.set(founderSessionCookie, session.raw, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 }); return response;
}
