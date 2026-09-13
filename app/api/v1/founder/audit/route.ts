import {NextResponse} from 'next/server';
import {getFounderIdentity} from '@/lib/auth';
import {getNeon} from '@/lib/neon';
export async function GET(){
  const user=await getFounderIdentity();
  if(!user)return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});
  if(!user.permissions.includes('founder.audit.read'))return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});
  const db=getNeon();
  const [totals,items]=await Promise.all([db`select count(*)::int as count from workora.audit_events`,db`select id,actor_type,actor_id,action,target_type,target_id,severity,created_at from workora.audit_events order by created_at desc limit 25`]);
  return NextResponse.json({data:{available:true,count:totals[0].count,items}},{headers:{'Cache-Control':'private, no-store'}});
}
