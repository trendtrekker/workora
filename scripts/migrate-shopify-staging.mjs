import {neon} from '@neondatabase/serverless';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const url=new URL(process.env.STAGING_DATABASE_URL);
assert.equal(url.hostname,'ep-sparkling-voice-aeucpah2-pooler.c-2.us-east-2.aws.neon.tech');
const db=neon(url.toString());
assert.equal((await db`select to_regclass('workora.shop_memberships') as name`)[0].name,null,'Migration already applied; do not rerun');
const migration=readFileSync('neon/migrations/0005_shopify_onboarding.sql','utf8');
const parts=[];let start=0,quoted=false,dollar=false;
for(let i=0;i<migration.length;i++){
  if(migration.slice(i,i+2)==='--'&&!quoted&&!dollar){i=migration.indexOf('\n',i);if(i<0)break;continue;}
  if(migration.slice(i,i+2)==='$$'&&!quoted){dollar=!dollar;i++;continue;}
  if(migration[i]==="'"&&!dollar){if(quoted&&migration[i+1]==="'"){i++;continue;}quoted=!quoted;}
  if(migration[i]===';'&&!quoted&&!dollar){parts.push(migration.slice(start,i).trim());start=i+1;}
}
await db.transaction(parts.filter(s=>s&&s!=='BEGIN'&&s!=='COMMIT').map(s=>db.query(s)));
console.log('Shopify onboarding migration applied to Workora staging');
