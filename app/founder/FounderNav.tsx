import Link from 'next/link';
export default function FounderNav({active='overview'}:{active?:string}) {
  return <aside><b className="logo">W<span>·</span></b><label>WORKORA</label><nav aria-label="Founder navigation">
    {Object.entries({overview:'Overview',merchants:'Merchants',subscriptions:'Subscriptions',support:'Support',audit:'Audit log'}).map(([key,title]) => <Link key={key} className={active===key?'selected':undefined} aria-current={active===key?'page':undefined} href={key==='overview'?'/founder':`/founder/${key}`}>{title}</Link>)}
  </nav></aside>;
}
