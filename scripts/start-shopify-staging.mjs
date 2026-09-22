import {loadEnvFile} from 'node:process';
import {spawn} from 'node:child_process';
loadEnvFile('.env.staging.local');loadEnvFile('.env.merchant-staging-20260922.local');loadEnvFile('.env.shopify.local');
const url=new URL(process.env.STAGING_DATABASE_URL);
if(url.hostname!=='ep-sparkling-voice-aeucpah2-pooler.c-2.us-east-2.aws.neon.tech')throw new Error('Unexpected staging endpoint');
// Use the existing restricted founder runtime credential only on the staging host.
// Never run this public test service using the schema owner or production database.
const {parseEnv}=await import('node:util');const {readFileSync}=await import('node:fs');
const runtime=new URL(parseEnv(readFileSync('.env.local','utf8')).DATABASE_URL);
if(runtime.username!=='awah_runtime')throw new Error('Unexpected runtime role');
runtime.hostname=url.hostname;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3218'],{
  env:{...process.env,DATABASE_URL:runtime.toString(),WORKORA_SHOPIFY_DEV_ONLY:'1'},stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
