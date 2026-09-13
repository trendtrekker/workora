'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
export default function CreateSupport(){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const router=useRouter();
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');
    try {const response=await fetch('/api/v1/founder/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({merchantId:data.get('merchantId'),channel:data.get('channel')})});const body=await response.json();if(!response.ok)throw Error(body.error?.message??'Creation failed.');setMessage('Support session created and recorded in the audit log.');form.reset();router.refresh();}
    catch(e){setMessage(e instanceof Error?e.message:'Creation failed.');}finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="panel" style={{marginBottom:16}}><h2>Create support session</h2><p>Copy the business ID from the Merchants page. This records a support case; it does not grant access to the merchant account.</p><label>Merchant ID <input name="merchantId" required/></label>{' '}<label>Channel <select name="channel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>{' '}<button disabled={busy}>{busy?'Creating…':'Create session'}</button><p role="status">{message}</p></form>;
}
