import { getNeon } from './neon';

export async function tableExists(table: string) {
  const db = getNeon();
  const rows = await db`select exists(select 1 from information_schema.tables where table_schema='workora' and table_name=${table}) as exists`;
  return Boolean(rows[0]?.exists);
}

export async function tableCount(table: string) {
  const db = getNeon();
  const rows = await db.query(`select count(*)::int as count from workora.${table}`);
  return Number(rows[0]?.count ?? 0);
}
