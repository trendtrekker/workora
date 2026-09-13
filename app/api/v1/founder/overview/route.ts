import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';
import { getNeon } from '@/lib/neon';

export async function GET() {
  const identity = await getFounderIdentity();
  if (!identity) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, { status: 401 });
  if (!identity.permissions.includes('founder.overview.read')) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Overview access is not permitted.' } }, { status: 403 });

  const db = getNeon();
  const tables = await db`select table_name from information_schema.tables where table_schema='workora' and table_type='BASE TABLE'`;
  const available = new Set(tables.map((row) => String(row.table_name)));
  const counts: Record<string, number> = {};
  for (const table of ['internal_users', 'sessions', 'audit_events', 'merchants', 'subscriptions']) {
    if (!available.has(table)) continue;
    const rows = await db.query(`select count(*)::int as count from workora.${table}`);
    counts[table] = Number(rows[0]?.count ?? 0);
  }

  return NextResponse.json({ data: { generatedAt: new Date().toISOString(), founder: { email: identity.email, roles: identity.roles }, counts } });
}
