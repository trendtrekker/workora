import { cookies } from 'next/headers';
import { getNeon } from './neon';

export const founderSessionCookie = 'workora_founder_session';
const sessionHours = 8;

export type FounderIdentity = { id: string; email: string; displayName: string; roles: string[]; permissions: string[]; sessionId: string };

function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(value: string) { return new Uint8Array(value.match(/.{1,2}/g)?.map((x) => Number.parseInt(x, 16)) ?? []); }

export async function derivePasswordHash(password: string, saltHex: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 210_000, hash: 'SHA-256' }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyTotp(secretBase32: string, code: string, now = Date.now()) {
  const normalized = secretBase32.replace(/=|\s/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const char of normalized) { const n = alphabet.indexOf(char); if (n < 0) return false; bits += n.toString(2).padStart(5, '0'); }
  const secret = new Uint8Array(Math.floor(bits.length / 8)); for (let i = 0; i < secret.length; i++) secret[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Math.floor(now / 1000 / 30); const payload = new ArrayBuffer(8); const view = new DataView(payload); view.setUint32(4, counter);
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']); const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload)); const offset = digest[digest.length - 1] & 15; const number = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return number % 1_000_000 === Number.parseInt(code.replace(/\D/g, ''), 10);
}

export async function createSession(userId: string, deviceName?: string) {
  const db = getNeon(); const raw = crypto.randomUUID() + crypto.randomUUID(); const tokenHash = await derivePasswordHash(raw, '776f726b6f72615f73657373696f6e'); const expires = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  const rows = await db`insert into workora.sessions (user_id, token_hash, device_name, expires_at) values (${userId}, ${tokenHash}, ${deviceName ?? 'Unknown device'}, ${expires.toISOString()}) returning id, expires_at`;
  return { raw, id: String(rows[0].id), expiresAt: new Date(rows[0].expires_at).toISOString() };
}

export async function getFounderIdentity(): Promise<FounderIdentity | null> {
  const token = (await cookies()).get(founderSessionCookie)?.value; if (!token) return null;
  const tokenHash = await derivePasswordHash(token, '776f726b6f72615f73657373696f6e'); const db = getNeon();
  const rows = await db`select u.id, u.email, u.display_name, s.id as session_id, array_remove(array_agg(distinct r.key), null) as roles, array_remove(array_agg(distinct p.key), null) as permissions from workora.sessions s join workora.internal_users u on u.id=s.user_id left join workora.user_roles ur on ur.user_id=u.id left join workora.internal_roles r on r.id=ur.role_id left join workora.role_permissions rp on rp.role_id=r.id left join workora.permissions p on p.id=rp.permission_id where s.token_hash=${tokenHash} and s.revoked_at is null and s.expires_at>now() and u.status='active' group by u.id,u.email,u.display_name,s.id`;
  const row = rows[0]; if (!row) return null; await db`update workora.sessions set last_seen_at=now() where id=${row.session_id}`;
  return { id: String(row.id), email: String(row.email), displayName: String(row.display_name), roles: (row.roles ?? []) as string[], permissions: (row.permissions ?? []) as string[], sessionId: String(row.session_id) };
}

export async function requirePermission(permission: string) { const identity = await getFounderIdentity(); if (!identity) throw new Error('UNAUTHENTICATED'); if (!identity.permissions.includes(permission)) throw new Error('FORBIDDEN'); return identity; }
