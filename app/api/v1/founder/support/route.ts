import {NextResponse} from 'next/server';
import {getFounderIdentity} from '@/lib/auth';
import {getNeon} from '@/lib/neon';

export async function GET() {
  const user=await getFounderIdentity();
  if(!user) return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});
  if(!user.permissions.includes('founder.support.grant')) return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});
  const db=getNeon();
  const [counts,items]=await Promise.all([
    db`select count(*)::int as records,count(*) filter (where status='open')::int as open from workora.support_sessions`,
    db`select id,merchant_id,status,channel,created_at from workora.support_sessions order by created_at desc limit 25`
  ]);
  return NextResponse.json({data:{available:true,...counts[0],items}},{headers:{'Cache-Control':'private, no-store'}});
}

export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:{message:'Invalid request origin.'}},{status:403});
  const user=await getFounderIdentity();
  if(!user) return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});
  if(!user.permissions.includes('founder.support.grant')) return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});
  const body=await request.json().catch(()=>null);
  if(!body || typeof body.merchantId!=='string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.merchantId) || !['email','whatsapp'].includes(body.channel)) return NextResponse.json({error:{message:'Select a merchant and a valid channel.'}},{status:400});
  const db=getNeon();
  try {
    // Session and audit entry commit together; this creates a support record, not impersonation access.
    const rows=await db`with created as (
      insert into workora.support_sessions (merchant_id,status,channel)
      select id,'open',${body.channel} from workora.merchants where id=${body.merchantId} returning *
    ), logged as (
      insert into workora.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)
      select 'internal_user',${user.id},'support.session.created','support_session',id,${crypto.randomUUID()} from created returning id
    ) select created.* from created cross join logged`;
    if(!rows.length) return NextResponse.json({error:{message:'Merchant not found.'}},{status:404});
    return NextResponse.json({data:rows[0]},{status:201});
  } catch {return NextResponse.json({error:{message:'Could not create the support session. Please retry.'}},{status:500});}
}
