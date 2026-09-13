import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';
import { tableCount, tableExists } from '@/lib/founder-data';
export async function GET(){const i=await getFounderIdentity();if(!i)return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});if(!i.permissions.includes('founder.overview.read'))return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});const source=(await tableExists('alerts'))?'alerts':null;return NextResponse.json({data:{source,items:[],count:source?await tableCount(source):0,available:Boolean(source)}})}
