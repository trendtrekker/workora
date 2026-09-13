import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';
import { getNeon } from '@/lib/neon';

export async function GET(request: Request) {
  const identity = await getFounderIdentity();
  if (!identity) return NextResponse.json({error: {code: 'UNAUTHENTICATED'}}, {status: 401});
  if (!identity.permissions.includes('founder.finance.read')) return NextResponse.json({error: {code: 'FORBIDDEN'}}, {status: 403});
  const params = new URL(request.url).searchParams;
  const from = new Date(params.get('from') ?? Date.now() - 365 * 86400000);
  const to = new Date(params.get('to') ?? Date.now());
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    return NextResponse.json({error: {message: 'Choose a valid date range.'}}, {status: 400});
  }
  try {
    const db = getNeon();
    const rows = await db`select to_char(date_trunc('month',created_at),'YYYY-MM') AS revenue_month,
      sum(gross_revenue-refunds-discounts-taxes)::numeric AS net
      from workora.subscriptions
      where created_at between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz
      group by 1 order by 1`;
    return NextResponse.json({data: {available: true, history: rows.map(row => ({month: row.revenue_month, netRevenue: Number(row.net)}))}}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch {
    console.error('Financial history query failed');
    return NextResponse.json({error: {message: 'Revenue history could not be loaded. Please retry.'}}, {status: 500});
  }
}
