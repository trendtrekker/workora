'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function SupportStatus({id,status}:{id:string;status:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function update(next:string){
    setBusy(true);setMessage('');
    try {const response=await fetch(`/api/v1/founder/support/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});const body=await response.json();if(!response.ok)throw Error(body.error?.message??'Update failed.');setMessage('Status saved and audit log updated.');router.refresh();}
    catch(e){setMessage(e instanceof Error?e.message:'Update failed.');}finally{setBusy(false);}
  }
  return <div style={{marginTop:16}}>{status==='open'&&<button disabled={busy} onClick={()=>update('in_progress')}>Mark In progress</button>}{' '}{['open','in_progress'].includes(status)&&<button disabled={busy} onClick={()=>update('resolved')}>Mark Resolved</button>}{status==='resolved'&&<p>Resolved</p>}<p role="status">{busy?'Saving…':message}</p></div>;
}
