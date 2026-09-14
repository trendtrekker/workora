import {NextResponse} from 'next/server';
import {getMerchantOverview} from '@/lib/merchant';
export async function GET(){
  try {
    const merchant=await getMerchantOverview();
    if(!merchant) return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401});
    return NextResponse.json({data:merchant},{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return NextResponse.json({error:{code:'UNAVAILABLE',message:'Merchant access is not available yet.'}},{status:503});
  }
}
