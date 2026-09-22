import {NextResponse} from 'next/server';
import {getMerchantOverview} from '@/lib/merchant';
export async function GET(request: Request){
  try {
    const merchant=await getMerchantOverview(request.headers.get('authorization'));
    if(!merchant) return NextResponse.json({error:{code:'UNAUTHENTICATED'}},{status:401,headers:{'Cache-Control':'private, no-store','X-Shopify-Retry-Invalid-Session-Request':'1'}});
    return NextResponse.json({data:merchant},{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return NextResponse.json({error:{code:'UNAVAILABLE',message:'Merchant access is not available yet.'}},{status:503,headers:{'Cache-Control':'private, no-store'}});
  }
}
