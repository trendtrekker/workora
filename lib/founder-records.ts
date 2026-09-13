import { getNeon } from './neon';

export const sections = {
  merchants: { title: 'Merchants', permission: 'founder.merchants.read', fields: ['id','name','status','created_at'] },
  subscriptions: { title: 'Subscriptions', permission: 'founder.finance.read', fields: ['id','merchant_id','gross_revenue','refunds','discounts','taxes','failed_payment','created_at'] },
  support: { title: 'Support', permission: 'founder.support.grant', fields: ['id','merchant_id','status','channel','created_at'] },
  audit: { title: 'Audit log', permission: 'founder.audit.read', fields: ['id','actor_type','actor_id','action','target_type','target_id','severity','reason','before_json','after_json','request_id','created_at'] },
} as const;
export type Section = keyof typeof sections;
const tables: Record<Section,string> = {merchants:'merchants',subscriptions:'subscriptions',support:'support_sessions',audit:'audit_events'};

export async function getRecords(section: Section, search: string, page: number) {
  // Table and column identifiers come only from the fixed allowlist above.
  const fields = sections[section].fields;
  const table = tables[section];
  const expression = fields.map(f => `coalesce(${f}::text,'')`).join(" || ' ' || ");
  const db = getNeon();
  const rows = await db.query(`select ${fields.join(',')} from workora.${table} where strpos(lower(${expression}),lower($1))>0 order by created_at desc, id desc limit 26 offset $2`, [search, (page-1)*25]);
  return {rows: rows.slice(0,25), hasNext: rows.length>25};
}
