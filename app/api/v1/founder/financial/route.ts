import { NextResponse } from 'next/server';
import { getFounderIdentity } from '@/lib/auth';
import { tableCount, tableExists } from '@/lib/founder-data';
export async function GET(){const i=await getFounderIdentity();if(!i)return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});if(!i.permissions.includes('founder.finance.read'))return NextResponse.json({error:{code:'FORBIDDEN'}},{status:403});const source=(await tableExists('subscriptions'))?'subscriptions':null;return NextResponse.json({data:{source,available:Boolean(source),grossRevenue:null,refunds:null,discounts:null,taxes:null,failedPayments:null,netRevenue:null,records:source?await tableCount(source):0}})}
