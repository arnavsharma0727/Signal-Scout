import Link from 'next/link';
import { serverSupabase } from '../../lib/server-supabase';

export const dynamic = 'force-dynamic';

type Metric = {
  metric_date: string;
  company_id: string;
  market_code: string;
  source_type: string;
  document_count: number;
  unique_content_hash_count: number;
  independent_domain_count: number;
  effective_domain_sample_size: number;
  first_seen_in_window_utc: string;
  baseline_observed_days: number;
  trailing_30d_document_median: number | null;
  trailing_30d_document_mad: number | null;
  evidence_status: 'insufficient' | 'descriptive_only';
  companies: { ticker: string; company_name_en: string } | null;
};

export default async function CoveragePage() {
  const db = serverSupabase();
  let rows: Metric[] = [];
  let unavailable = !db;
  if (db) {
    const { data, error } = await db.from('metrics_daily')
      .select('metric_date,company_id,market_code,source_type,document_count,unique_content_hash_count,independent_domain_count,effective_domain_sample_size,first_seen_in_window_utc,baseline_observed_days,trailing_30d_document_median,trailing_30d_document_mad,evidence_status,companies(ticker,company_name_en)')
      .neq('source_type','hacker-news')
      .order('metric_date', { ascending: false }).order('company_id').limit(300);
    unavailable = Boolean(error);
    rows = (data ?? []) as unknown as Metric[];
  }
  return <div className="min-h-screen">
    <header className="shell flex h-20 items-center justify-between border-b border-line"><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><Link href="/" className="text-sm text-muted">← Briefing</Link></header>
    <main className="shell py-14">
      <div className="eyebrow mb-4">Evidence quality</div><h1 className="text-4xl font-extrabold tracking-tight">Coverage</h1>
      <p className="mt-4 max-w-3xl leading-7 text-muted">Daily counts of entity-linked records by market and source class. This describes only the sources configured in Signal Scout; it does not estimate investor-wide attention or establish a Korea/U.S. difference.</p>
      <div className="panel mt-7 p-5 text-sm leading-6"><strong>Interpretation:</strong> “Descriptive only” means the minimum record and domain thresholds were met. It is not statistical significance, representativeness, sentiment, or a trading signal. Distinct content hashes do not cluster syndicated or semantically similar stories. <Link className="underline underline-offset-4" href="/methodology">Read methodology.</Link></div>
      {unavailable ? <div className="panel mt-5 p-7"><h2 className="text-lg font-semibold">Coverage metrics are not available yet.</h2><p className="mt-2 text-sm leading-6 text-muted">The metrics schema is not configured or could not be read. No measurements are inferred or substituted.</p></div> : rows.length === 0 ? <div className="panel mt-5 p-7"><h2 className="text-lg font-semibold">No entity coverage metrics yet.</h2><p className="mt-2 text-sm leading-6 text-muted">Metrics appear after reviewed entity profiles are linked to eligible source records and the daily computation runs.</p></div> : <div className="panel mt-5 overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr>{['UTC date','Entity','Market','Source class','Records','Distinct hashes','Domains','Effective domains','First seen in window','30-day baseline (median/MAD)','Evidence status'].map(x=><th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map(row=><tr key={`${row.metric_date}-${row.company_id}-${row.market_code}-${row.source_type}`}><td className="px-4 py-3">{row.metric_date}</td><td className="px-4 py-3">{row.companies?.company_name_en ?? row.company_id}</td><td className="px-4 py-3">{row.market_code}</td><td className="px-4 py-3">{row.source_type}</td><td className="px-4 py-3">{row.document_count}</td><td className="px-4 py-3">{row.unique_content_hash_count}</td><td className="px-4 py-3">{row.independent_domain_count}</td><td className="px-4 py-3">{Number(row.effective_domain_sample_size).toFixed(2)}</td><td className="px-4 py-3">{new Date(row.first_seen_in_window_utc).toISOString()}</td><td className="px-4 py-3">{row.trailing_30d_document_median === null ? `Insufficient (${row.baseline_observed_days} observed days)` : `${row.trailing_30d_document_median} / ${row.trailing_30d_document_mad} · ${row.baseline_observed_days} observed days`}</td><td className="px-4 py-3">{row.evidence_status === 'descriptive_only' ? 'Descriptive only' : 'Insufficient'}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-xs leading-5 text-muted">Rows are grouped by UTC publication date, entity, market, and source class. Baselines use available prior observation-days only; missing days are not treated as zero. Topic/stance is left unclassified until validated. Forum and news samples are not pooled. <Link className="underline underline-offset-4" href="/sources">Check source status.</Link></p>
    </main>
  </div>;
}
