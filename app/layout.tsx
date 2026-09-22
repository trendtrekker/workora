import type { ReactNode } from 'react';
import {headers} from 'next/headers';
import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const merchant=(await headers()).get('x-workora-surface')==='merchant';
  return <html lang="en"><head>{merchant&&process.env.SHOPIFY_API_KEY&&<>
    <meta name="shopify-api-key" content={process.env.SHOPIFY_API_KEY}/>
    {/* App Bridge must be the first script, without async/defer/module. */}
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
  </>}</head><body>{children}</body></html>;
}
