'use client';
import {useEffect, useState} from 'react';
type Point = {month: string; netRevenue: number};
export default function FinancialHistory() {
  const [range, setRange] = useState('365');
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({from: new Date(Date.now()-Number(range)*86400000).toISOString(), to: new Date().toISOString()});
    fetch(`/api/v1/founder/financial?${params}`, {signal: controller.signal, cache: 'no-store'})
      .then(async response => {
        if (!response.ok) throw new Error(`Revenue could not be loaded (HTTP ${response.status}).`);
        const body = await response.json();
        setPoints(body.data.history);
      }).catch(e => {if (!controller.signal.aborted) setError(e.message);})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [range]);
  const max = Math.max(...points.map(p => Math.abs(p.netRevenue)), 1);
  return <section className="panel">
    <small>REVENUE ANALYTICS</small><h3>Platform performance</h3>
    <select aria-label="Revenue date range" value={range} onChange={e => setRange(e.target.value)}>
      <option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option>
    </select>
    {loading ? <p role="status">Loading revenue…</p> : error ? <p role="alert">{error}</p> : !points.length ? <p>No revenue records in this period.</p> : <>
      <div className="chart" aria-label="Monthly net revenue">{points.map(p => <span key={p.month} title={`${p.month}: ${p.netRevenue.toFixed(2)}`} style={{height: `${Math.max(2,Math.abs(p.netRevenue)/max*100)}%`}} />)}</div>
      <table style={{width: '100%', marginTop: 16}}><caption>Recorded net revenue</caption><thead><tr><th scope="col">Month</th><th scope="col">Amount</th></tr></thead><tbody>{points.map(p => <tr key={p.month}><td>{p.month}</td><td>{p.netRevenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>)}</tbody></table>
    </>}
  </section>;
}
