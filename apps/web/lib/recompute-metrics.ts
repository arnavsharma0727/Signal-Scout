import { aggregateDailyMetrics, type EvidenceRow } from './daily-metrics';

export async function recomputeEntityDailyMetrics(db: any, date = new Date().toISOString().slice(0, 10)) {
  const from = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(`${date}T23:59:59.999Z`).toISOString();
  const rows: EvidenceRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('document_entities')
      .select('company_id,source_documents!inner(market_code,source_type,published_at,content_hash,source_domain,title_original)')
      .gte('source_documents.published_at', from).lte('source_documents.published_at', to)
      .range(offset, offset + 999);
    if (error) throw new Error('Metric evidence query failed');
    rows.push(...((data ?? []) as unknown as EvidenceRow[]));
    if (!data || data.length < 1000) break;
    if (offset >= 49000) throw new Error('Evidence row safety limit exceeded');
  }
  const metrics = aggregateDailyMetrics(rows, date);
  if (metrics.length) {
    const { error } = await db.from('metrics_daily').upsert(metrics, { onConflict: 'metric_date,company_id,market_code,source_type' });
    if (error) throw new Error('Metric write failed');
  }
  return { metricDateUtc: date, linkedEvidenceRows: rows.length, metricsWritten: metrics.length };
}
