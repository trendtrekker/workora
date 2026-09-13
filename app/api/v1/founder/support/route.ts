import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';
import { tableCount, tableExists } from '@/lib/founder-data';
export async function GET(){const i=await getFounderIdentity();if(!i)return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});if(!i.permissions.includes('founder.support.grant'))return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});const source=(await tableExists('support_sessions'))?'support_sessions':null;return NextResponse.json({data:{source,open:0,waiting:0,staffed:0,available:Boolean(source),records:source?await tableCount(source):0}})}
