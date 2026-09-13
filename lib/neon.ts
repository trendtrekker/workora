import { neon } from '@neondatabase/serverless';

export function getNeon() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured for Workora.');
  return neon(url);
}
