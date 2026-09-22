import {neon} from '@neondatabase/serverless';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

const url=new URL(process.env.STAGING_DATABASE_URL);
assert.equal(url.hostname,'ep-sparkling-voice-aeucpah2-pooler.c-2.us-east-2.aws.neon.tech','Unexpected staging endpoint');
const admin=neon(url.toString());
const role='workora_merchant_staging';
const secretFile='.env.merchant-staging-20260922.local';
// Preserve dollar-quoted blocks while splitting the checked-in migration.
const migration=readFileSync('neon/migrations/0004_merchant_isolation.sql','utf8');
const parts=[];let start=0,quoted=false,dollar=false;
for(let i=0;i<migration.length;i++){
  if(migration.slice(i,i+2)==='--'&&!quoted&&!dollar){i=migration.indexOf('\n',i);if(i<0)break;continue;}
  if(migration.slice(i,i+2)==='$$'&&!quoted){dollar=!dollar;i++;continue;}
  if(migration[i]==="'"&&!dollar){if(quoted&&migration[i+1]==="'"){i++;continue;}quoted=!quoted;}
  if(migration[i]===';'&&!quoted&&!dollar){parts.push(migration.slice(start,i).trim());start=i+1;}
}
if(!(await admin`select to_regclass('workora.shop_installations') as name`)[0].name){
  await admin.transaction(parts.filter(s=>s&&s!=='BEGIN'&&s!=='COMMIT').map(s=>admin.query(s)));
  console.log('Isolation migration applied to staging');
}
let merchantUrl;
const existing=await admin`select rolname from pg_roles where rolname=${role}`;
if(existing.length){
  assert(existsSync(secretFile),'Role exists but its saved credential is missing; refusing to rotate');
  const saved=readFileSync(secretFile,'utf8').trim();
  merchantUrl=saved.slice(saved.indexOf('=')+1);
}else{
  const password=randomBytes(32).toString('hex');
  const scoped=new URL(url);scoped.username=role;scoped.password=password;
  merchantUrl=scoped.toString();
  writeFileSync(secretFile,`MERCHANT_DATABASE_URL=${merchantUrl}\n`,{mode:0o600,flag:'wx'});
  await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT`);
  await admin.query(`GRANT workora_merchant TO ${role}`);
}
const db=neon(merchantUrl);
const roles=await db`select rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,pg_has_role(current_user,'awah_runtime','MEMBER') as founder from pg_roles where rolname=current_user`;
assert(Object.values(roles[0]).every(x=>x===false),'Excessive login privileges');
console.log('Dedicated login verified; credential saved locally, not printed');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
await admin.transaction([
  admin`insert into workora.merchants(id,name,status) values(${a},'ISOLATION TEST A','active'),(${b},'ISOLATION TEST B','active') on conflict(id) do nothing`,
  admin`insert into workora.subscriptions(id,merchant_id,gross_revenue) values('11111111-1111-4111-8111-111111111112',${a},11),('22222222-2222-4222-8222-222222222223',${b},22) on conflict(id) do nothing`,
  admin`insert into workora.support_sessions(id,merchant_id,status,channel) values('11111111-1111-4111-8111-111111111113',${a},'open','email'),('22222222-2222-4222-8222-222222222224',${b},'open','email') on conflict(id) do nothing`
]);
for(const id of [a,b]){
  const result=await db.transaction([
    db`select set_config('workora.merchant_id',${id},true)`,
    db`select id from workora.merchants`,
    db`select merchant_id from workora.subscriptions`,
    db`select merchant_id from workora.support_sessions`
  ]);
  assert.deepEqual(result[1].map(r=>r.id),[id]);
  for(const rows of result.slice(2)){assert.equal(rows.length,1);assert(rows.every(r=>r.merchant_id===id));}
}
console.log('PASS: A and B see only their own business, subscriptions and support');
for(const table of ['merchants','subscriptions','support_sessions']){
  assert.equal((await db.query(`select * from workora.${table}`)).length,0);
}
console.log('PASS: no tenant context returns no rows after pooled transactions');
for(const table of ['internal_users','sessions','merchant_sessions','shop_installations','audit_events']){
  let denied=false;try{await db.query(`select * from workora.${table} limit 1`);}catch(e){denied=e.code==='42501';}assert(denied,`Read not denied: ${table}`);
}
for(const table of ['merchants','subscriptions','support_sessions']){
  let denied=false;try{await db.query(`update workora.${table} set id=id where false`);}catch(e){denied=e.code==='42501';}assert(denied,`Write not denied: ${table}`);
}
console.log('PASS: founder/identity/audit reads and merchant updates denied');
console.log('STAGING ISOLATION CHECKS PASSED');
