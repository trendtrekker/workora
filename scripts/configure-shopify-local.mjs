// One-shot, loopback-only credential form. Never expose this through the app tunnel.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const nonce=randomBytes(24).toString('hex');
const origin='http://127.0.0.1:3216';
const path=`/configure/${nonce}`;
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; frame-ancestors 'none'; style-src 'unsafe-inline'");
  if(req.headers.host!=='127.0.0.1:3216'||req.url!==path){res.writeHead(404).end();return;}
  if(req.method==='GET'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<title>Configure Workora locally</title><main style="font:18px system-ui;max-width:600px;margin:80px auto"><h1>Workora Shopify credentials</h1><p>Save the existing client secret to this computer’s ignored Workora configuration.</p><form method="post"><label>Shopify client secret <input type="password" name="secret" required autocomplete="off"></label><button type="submit">Save locally</button></form></main>');return;
  }
  if(req.method!=='POST'||req.headers.origin!==origin){res.writeHead(403).end();return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413).end();return;}}
  const secret=new URLSearchParams(body).get('secret')?.trim();
  if(!secret||!/^[A-Za-z0-9_-]{20,200}$/.test(secret)){res.writeHead(400).end('Invalid secret format');return;}
  writeFileSync('.env.shopify.local',`SHOPIFY_API_KEY=f3238ae1bb1b19741d1e7d272d1fc052\nSHOPIFY_API_SECRET=${secret}\n`,{mode:0o600});
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<title>Workora configured</title><h1>Shopify credentials saved locally</h1><p>The secret was not printed or added to source control.</p>');
  console.log('Shopify credentials saved to ignored local configuration');server.close();
});
server.listen(3216,'127.0.0.1',()=>console.log(origin+path));
setTimeout(()=>server.close(),600000).unref();
