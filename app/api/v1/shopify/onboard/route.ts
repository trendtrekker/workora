import {NextResponse} from 'next/server';
import {onboardShop,OnboardingError} from '@/lib/shopify-onboarding';
export const runtime='nodejs';
export async function POST(request:Request){
  const headers={'Cache-Control':'private, no-store'};
  try{return NextResponse.json({data:await onboardShop(request.headers.get('authorization'))},{headers});}
  catch(error){
    const status=error instanceof OnboardingError?error.status:503;
    const code=error instanceof OnboardingError?error.code:'ONBOARDING_UNAVAILABLE';
    console.warn('Workora onboarding failed:',code);
    // Shopify library errors may embed access tokens. Do not log the error object.
    return NextResponse.json({error:{code}},{status,headers:{...headers,...(status===401?{'X-Shopify-Retry-Invalid-Session-Request':'1'}:{})}});
  }
}
