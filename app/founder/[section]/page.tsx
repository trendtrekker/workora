import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getFounderIdentity} from '@/lib/auth';
import {getRecords, sections, type Section} from '@/lib/founder-records';
import FounderNav from '../FounderNav';
import CreateSupport from '../CreateSupport';
import SupportStatus from '../SupportStatus';

export default async function RecordsPage({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{q?:string;page?:string}>}) {
  const {section: name} = await params;
  if (!Object.prototype.hasOwnProperty.call(sections,name)) notFound();
  const section = name as Section;
  const identity = await getFounderIdentity();
  if (!identity) redirect('/founder/sign-in');
  const config = sections[section];
  if (!identity.permissions.includes(config.permission)) return <main className="founder"><FounderNav active={section}/><section className="body"><h1>Access restricted</h1><p>Your role does not have permission to view these records.</p></section></main>;
  const query = await searchParams;
  const search = typeof query.q==='string'?query.q.slice(0,200):'';
  const number = Number(query.page ?? 1);
  const page = Number.isSafeInteger(number)&&number>0&&number<=10000?number:1;
  let result: Awaited<ReturnType<typeof getRecords>> | null = null;
  try {result = await getRecords(section,search,page);} catch {console.error(`Failed to load founder ${section} records`);}
  const url = (p:number) => `/founder/${section}?${new URLSearchParams({q:search,page:String(p)})}`;
  return <main className="founder"><FounderNav active={section}/><section className="body"><header><div><small>FOUNDER CONSOLE</small><h1>{config.title}</h1><p>Search records and expand an entry to see its details.</p></div></header>
    {section==='support'&&<CreateSupport/>}
    <form method="get" className="panel"><label htmlFor="record-search">Search {config.title.toLowerCase()}</label>{' '}<input id="record-search" name="q" defaultValue={search} maxLength={200}/>{' '}<button type="submit">Search</button>{' '}<Link href={`/founder/${section}`}>Clear</Link></form>
    <section className="panel" style={{marginTop:16}}>
      {!result?<p role="alert">Records could not be loaded. Please reload to retry.</p>:!result.rows.length?<p>No matching records.</p>:result.rows.map(row=><details key={String(row.id)} style={{padding:'16px 0',borderBottom:'1px solid #e6e3e8'}}><summary style={{cursor:'pointer'}}>{String(row.name??row.action??row.id)} {row.status?` · ${row.status}`:''} · {new Date(row.created_at).toISOString().slice(0,10)}</summary><dl>{config.fields.map(field=><div key={field} style={{display:'flex',gap:16,flexWrap:'wrap',margin:'12px 0'}}><dt style={{minWidth:150,fontWeight:600}}>{field.replaceAll('_',' ')}</dt><dd style={{margin:0,overflowWrap:'anywhere'}}>{row[field]===null?'—':field==='created_at'?new Date(row[field]).toISOString():typeof row[field]==='object'?JSON.stringify(row[field]):String(row[field])}</dd></div>)}</dl>{section==='support'&&<SupportStatus id={String(row.id)} status={String(row.status)}/>}</details>)}
      <nav aria-label="Records pagination" style={{display:'flex',gap:24,marginTop:20}}>{page>1&&<Link href={url(page-1)}>Previous</Link>}<span>Page {page}</span>{result?.hasNext&&<Link href={url(page+1)}>Next</Link>}</nav>
    </section>
  </section></main>;
}
