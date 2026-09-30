#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const base = (process.env.VERIFY_PROD_URL || 'https://signal-scout-xi-ruby.vercel.app').replace(/\/$/, '');
const gates = [];
const pass = (name, detail) => gates.push({name, ok:true, detail});
const fail = (name, detail) => gates.push({name, ok:false, detail});

// Read only the two database settings needed for diagnostics; never print values.
if ((!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

for (const route of ['/', '/about', '/companies', '/coverage', '/candidates', '/methodology', '/sources', '/privacy', '/contact']) {
  try {
    const response = await fetch(`${base}${route}`, {redirect:'follow', signal:AbortSignal.timeout(15000)});
    if (response.ok) pass(`route ${route}`, `HTTP ${response.status}`);
    else fail(`route ${route}`, `HTTP ${response.status}`);
  } catch (error) { fail(`route ${route}`, error.message); }
}

try {
  const response = await fetch(`${base}/api/ingest`, {signal:AbortSignal.timeout(10000)});
  if (response.status === 401 || response.status === 403) pass('ingestion endpoint protected', `Unauthenticated request returned HTTP ${response.status}`);
  else fail('ingestion endpoint protected', `Expected 401/403, got HTTP ${response.status}`);
} catch (error) { fail('ingestion endpoint protected', error.message); }

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function rest(path, method='GET', prefer='count=exact') {
  const response = await fetch(`${url}/rest/v1/${path}`, {method, headers:{apikey:key, Authorization:`Bearer ${key}`, Prefer:prefer, Range:'0-9999'}, signal:AbortSignal.timeout(15000)});
  const range = response.headers.get('content-range');
  if (!response.ok) throw new Error(`database query returned HTTP ${response.status}`);
  return {count: range && range.includes('/') ? Number(range.split('/')[1]) : null, data: method === 'GET' ? await response.json() : null};
}

if (!url || !key) {
  fail('database-backed gates', 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or keep them in local .env.local); credentials are never printed.');
} else {
  try {
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const relevant=await rest(`document_entities?select=document_id,source_documents!inner(market_code,source_type,source_domain,published_at)&source_documents.published_at=gte.${encodeURIComponent(since)}`);
    const rows=relevant.data??[];
    const documents=new Map(rows.map(row=>[row.document_id,row.source_documents]));
    if (documents.size >= 500) pass('>=500 entity-relevant source documents in last 24h', `${documents.size} unique linked documents`); else fail('>=500 entity-relevant source documents in last 24h', `${documents.size} unique linked documents; requires 500`);
    const domains = new Set([...documents.values()].map(x=>x.source_domain).filter(Boolean));
    const markets = new Set([...documents.values()].map(x=>x.market_code).filter(Boolean));
    const classes = new Set([...documents.values()].map(x=>x.source_type).filter(Boolean));
    if (domains.size >= 8) pass('>=8 independent source domains', `${domains.size} domains`); else fail('>=8 independent source domains', `${domains.size} domains; requires 8`);
    if (markets.size >= 2 && classes.size >= 2) pass('multi-market/source-class coverage', `${markets.size} markets, ${classes.size} source classes`); else fail('multi-market/source-class coverage', `${markets.size} markets, ${classes.size} source classes; requires at least 2 of each`);
    const unresolved=await rest('source_documents?select=id&or=(source_domain.is.null,source_domain.eq.)');
    if(unresolved.count===0)pass('zero documents missing publisher domain','all records have a resolved domain');else fail('zero documents missing publisher domain',`${unresolved.count??'unknown'} unresolved records`);
    try {
      const metrics = await rest('metrics_daily?select=company_id,market_code,source_type&metric_date=eq.'+new Date().toISOString().slice(0,10));
      const entities = new Set((metrics.data ?? []).map(row => row.company_id).filter(Boolean));
      if (entities.size >= 40) pass('>=40 entities with computed metrics today', `${entities.size} distinct entities across ${metrics.count} market/source-class metrics`); else fail('>=40 entities with computed metrics today', `${entities.size} distinct entities across ${metrics.count ?? 'unknown'} metrics; requires 40 entities`);
    } catch { fail('>=40 entities with computed metrics today', 'metrics_daily table or daily metric computation is not available'); }
    try {
      const leads = await rest('research_leads?select=id,verified_evidence_json,alternative_explanations_json&status=eq.active');
      if (leads.count > 0 && leads.data?.every(x=>x.verified_evidence_json && x.alternative_explanations_json)) pass('active leads have evidence and counter-evidence', `${leads.count} leads`);
      else fail('active leads have evidence and counter-evidence', `${leads.count ?? 0} complete active leads`);
    } catch { fail('active leads have evidence and counter-evidence', 'Lead evidence query failed or required schema is unavailable'); }
    try {
      const log = await rest('lead_track_record?select=id');
      if (log.count >= 30) pass('prospective track-record sample', `${log.count} observations`); else fail('prospective track-record sample', `${log.count ?? 0} observations; requires 30 before reporting outcomes`);
    } catch { fail('prospective track-record sample', 'Append-only lead_track_record table is not available'); }
  } catch (error) { fail('database-backed gates', error.message); }
}

console.log(`Signal Scout production verification: ${base}`);
for (const gate of gates) console.log(`${gate.ok ? 'PASS' : 'FAIL'} ${gate.name}: ${gate.detail}`);
const failed = gates.filter(g=>!g.ok).length;
console.log(`\n${gates.length-failed}/${gates.length} checks passed; ${failed} release gates remain.`);
if (failed) process.exitCode = 1;
