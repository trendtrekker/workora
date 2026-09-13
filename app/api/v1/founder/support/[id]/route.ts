import {NextResponse} from 'next/server';
import {getFounderIdentity} from '@/lib/auth';
import {getNeon} from '@/lib/neon';

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:{message:'Invalid request origin.'}},{status:403});
  const user=await getFounderIdentity();
  if(!user) return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});
  if(!user.permissions.includes('founder.support.grant')) return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null);
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !body || !['in_progress','resolved'].includes(body.status)) return NextResponse.json({error:{message:'Invalid session or status.'}},{status:400});
  const db=getNeon();
  try {
    const rows=await db`with previous as (
      select id,status from workora.support_sessions where id=${id} for update
    ), changed as (
      update workora.support_sessions s set status=${body.status}
      from previous p where s.id=p.id and
      ((p.status='open' and ${body.status} in ('in_progress','resolved')) or (p.status='in_progress' and ${body.status}='resolved'))
      returning s.id,s.status,p.status as old_status
    ), logged as (
      insert into workora.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,before_json,after_json)
      select 'internal_user',${user.id},'support.session.status_changed','support_session',id,${crypto.randomUUID()},
        jsonb_build_object('status',old_status),jsonb_build_object('status',status)
      from changed returning id
    ) select changed.id,changed.status from changed cross join logged`;
    if(!rows.length) return NextResponse.json({error:{message:'Session was not found or its status has already changed. Refresh the page.'}},{status:409});
    return NextResponse.json({data:rows[0]});
  } catch {return NextResponse.json({error:{message:'Status could not be saved. Please retry.'}},{status:500});}
}
