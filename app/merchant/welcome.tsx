'use client';
import {useEffect,useState} from 'react';
type Merchant={id:string;name:string;shop:string;role:string};
declare global {interface Window {shopify?:{idToken:()=>Promise<string>};}}
export default function MerchantWelcome(){
  const [merchant,setMerchant]=useState<Merchant|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(true);
  async function connect(){
    setBusy(true);setError('');
    try{
      if(!new URLSearchParams(window.location.search).has('host'))throw new Error('Open Workora from Apps in your Shopify admin to sign in.');
      for(let i=0;i<30&&!window.shopify;i++)await new Promise(r=>setTimeout(r,200));
      if(!window.shopify)throw new Error('Shopify could not finish connecting. Please reload the app from your Shopify admin.');
      const token=await window.shopify.idToken();
      const response=await fetch('/api/v1/shopify/onboard',{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error?.code==='OWNER_REQUIRED'?'Please ask the Shopify store owner to open Workora.':response.status===401?'Your Shopify session expired. Please reopen Workora.':'Workora could not connect your store. Please try again.');
      setMerchant(result.data);
    }catch(error){setError(error instanceof Error?error.message:'Could not connect. Please try again.');}
    finally{setBusy(false);}
  }
  useEffect(()=>{void connect();},[]);
  return <main style={{maxWidth:880,margin:'0 auto',padding:'48px 24px',fontSize:16}}>
    <div style={{fontSize:28,fontWeight:700,marginBottom:36}}>workora<span style={{color:'#829813'}}>.</span></div>
    <section className="hero" aria-live="polite">
      <small>YOUR BUSINESS</small>
      <h1 style={{fontSize:32,margin:'16px 0'}}>{merchant?`Welcome, ${merchant.name}`:'Connect your Shopify store'}</h1>
      <p>{busy?'Verifying your Shopify sign-in…':merchant?'Your Shopify store is connected to Workora.':'Sign in securely through your Shopify admin.'}</p>
    </section>
    {error&&<div role="alert" className="error">{error}</div>}
    {merchant&&<section className="panel"><h2>Store connected</h2><dl><dt>Store</dt><dd style={{margin:'8px 0 24px'}}>{merchant.shop}</dd><dt>Your access</dt><dd style={{margin:'8px 0'}}>Store owner</dd></dl><p style={{marginTop:24}}>Your business workspace is ready. Service setup, bookings and scheduling are coming next.</p></section>}
    {!busy&&<button onClick={()=>void connect()} style={{marginTop:20,padding:'12px 20px',font:'inherit',background:'#291b35',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>{merchant?'Verify connection again':'Try again'}</button>}
  </main>;
}
