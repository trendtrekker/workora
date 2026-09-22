import MerchantWelcome from './welcome';
export const dynamic='force-dynamic';
export default function MerchantPage(){
  const apiKey=process.env.SHOPIFY_API_KEY;
  if(!apiKey)return <main className="body"><h1>Workora</h1><p>Shopify connection is being configured. Please try again shortly.</p></main>;
  return <MerchantWelcome/>;
}
