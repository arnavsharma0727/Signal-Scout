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

try {
  const response = await fetch(`${base}/api/metrics/recompute`, {method:'POST',signal:AbortSignal.timeout(10000)});
  if (response.status === 401 || response.status === 403) pass('metrics recompute endpoint protected', `Unauthenticated request returned HTTP ${response.status}`);
  else fail('metrics recompute endpoint protected', `Expected 401/403, got HTTP ${response.status}`);
} catch (error) { fail('metrics recompute endpoint protected', error.message); }

try {
  const response = await fetch(`${base}/sources`, {redirect:'follow',signal:AbortSignal.timeout(15000)});
  const page = await response.text();
  if (response.ok && page.includes('Disabled unless collection and display rights are explicitly cleared')) pass('uncleared Hacker News source is visibly disabled','rights approval gate is shown');
  else fail('uncleared Hacker News source is visibly disabled',`HTTP ${response.status}; rights gate copy missing`);
} catch (error) { fail('uncleared Hacker News source is visibly disabled',error.message); }

try {
  const response = await fetch(`${base}/explore`, {redirect:'follow',signal:AbortSignal.timeout(15000)});
  const page = await response.text();
  if (response.ok && page.includes('Search one topic across selected sources') && page.includes('Run source sweep')) pass('international live source sweep is public', `HTTP ${response.status}; source choices and direct-search workflow rendered`);
  else fail('international live source sweep is public', `HTTP ${response.status}; source sweep UI missing`);
} catch (error) { fail('international live source sweep is public',error.message); }

try {
  const response = await fetch(`${base}/`, {redirect:'follow',signal:AbortSignal.timeout(15000)});
  const page = await response.text();
  if (response.ok && page.includes('Recent source evidence') && !page.includes('Hacker News comment') && !page.includes('The remaining U.S.-leaning Hacker News sample is shown below')) pass('public briefing withholds uncleared source material','homepage evidence panel excludes the disabled source');
  else fail('public briefing withholds uncleared source material',`HTTP ${response.status}; disallowed source may be shown or current evidence panel is missing`);
} catch (error) { fail('public briefing withholds uncleared source material',error.message); }

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function rest(path, method='GET', prefer='count=exact') {
  const response = await fetch(`${url}/rest/v1/${path}`, {method, headers:{apikey:key, Authorization:`Bearer ${key}`, Prefer:prefer, Range:'0-9999'}, signal:AbortSignal.timeout(15000)});
  const range = response.headers.get('content-range');
  if (!response.ok) throw new Error(`database query returned HTTP ${response.status}`);
  return {count: range && range.includes('/') ? Number(range.split('/')[1]) : null, data: method === 'GET' ? await response.json() : null};
}

if (!url || !key) {
  fail('database-backed research checks', 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or keep them in local .env.local); credentials are never printed.');
} else {
  try {
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const recent=await rest(`source_documents?select=id,source_type,source_domain,market_code,language_code,published_at,raw_metadata_json&published_at=gte.${encodeURIComponent(since)}`);
    const eligible=(recent.data??[]).filter(row=>row.source_type!=='hacker-news' && !['news.google.com','www.news.google.com'].includes((row.source_domain??'').toLowerCase()));
    const types=new Set(eligible.map(row=>row.source_type).filter(Boolean));
    const domains=new Set(eligible.map(row=>row.source_domain).filter(Boolean));
    const discussions=eligible.filter(row=>['stack-exchange','lemmy','mastodon','bluesky','reddit'].includes(row.source_type) && (row.source_type!=='stack-exchange'||matchesDiscussionTitle(row.title_original,row.raw_metadata_json?.query)));
    const communities=new Set(discussions.filter(row=>row.source_type==='stack-exchange').map(row=>row.raw_metadata_json?.site).filter(Boolean));
    const news=eligible.filter(row=>['rss','gdelt','news','licensed-reporting'].includes(row.source_type));
    const licensedAnalysis=eligible.filter(row=>row.source_type==='licensed-analysis');
    const officialContext=eligible.filter(row=>row.source_type==='official-policy');
    if(eligible.length>=20)pass('>=20 eligible live source records / 24h',`${eligible.length} records; ${domains.size} host labels across ${types.size} stored source types (hostnames are not proof of independent owners)`);
    else fail('>=20 eligible live source records / 24h',`${eligible.length} eligible records; requires 20`);
    if(discussions.length>0)pass('scheduled public discussion collection',`${discussions.length} records; ${communities.size} Stack Exchange community indexes (one platform operator)`);
    else fail('scheduled public discussion collection','No eligible scheduled discussion records in the last 24 hours');
    if(officialContext.length>0)pass('institutional context is retained separately',`${officialContext.length} official-policy records; not counted as news or public discussion`);
    else fail('institutional context is retained separately','No recent official-policy records');
    if(news.length>0)pass('independent/news-source records are available',`${news.length} recent independent reporting/RSS/GDELT/news records`);
    else fail('independent/news-source records are available','No recent independent reporting/RSS/GDELT/news records; official releases are not substituted for reporting');
    if(licensedAnalysis.length>0)pass('licensed expert analysis is available separately',`${licensedAnalysis.length} records; not counted as public discussion or independent reporting`);
    else fail('licensed expert analysis is available separately','No recent licensed-analysis records');
    if(communities.size>=3)pass('discussion coverage spans multiple expert communities',`${communities.size} Stack Exchange community indexes; all remain one Q&A operator`);
    else fail('discussion coverage spans multiple expert communities',`${communities.size} community indexes; requires 3`);
    const unresolved=await rest('source_documents?select=id&or=(source_domain.is.null,source_domain.eq.)');
    if(unresolved.count===0)pass('zero documents missing publisher domain','all records have a resolved domain');else fail('zero documents missing publisher domain',`${unresolved.count??'unknown'} unresolved records`);
    const recentRuns=await rest(`connector_runs?select=connector_name,status,started_at,items_stored&started_at=gte.${encodeURIComponent(since)}`);
    const groupedRuns=new Map();
    for(const run of recentRuns.data??[]){
      const group=groupedRuns.get(run.connector_name)??{success:0,failed:0,stored:0};
      if(run.status==='completed'||run.status==='partial')group.success++;
      if(run.status==='failed')group.failed++;
      group.stored+=run.items_stored??0;
      groupedRuns.set(run.connector_name,group);
    }
    const stackRuns=groupedRuns.get('stack-exchange');
    if(stackRuns?.success&&stackRuns.stored>0)pass('scheduled Stack Exchange connector is operational',`${stackRuns.success} successful/partial runs; ${stackRuns.stored} stored items`);
    else fail('scheduled Stack Exchange connector is operational','No successful Stack Exchange run with stored items in the last 24 hours');
    const gdeltRuns=groupedRuns.get('gdelt');
    if(gdeltRuns)pass('GDELT source health reported',`${gdeltRuns.success} successful/partial, ${gdeltRuns.failed} failed, ${gdeltRuns.stored} stored in 24h`);
    else fail('GDELT source health reported','No GDELT run recorded in the last 24 hours');
    try {
      const leads = await rest('research_leads?select=id,verified_evidence_json,alternative_explanations_json&status=eq.active');
      const unsupported=leads.data?.filter(x=>!x.verified_evidence_json||!x.alternative_explanations_json)??[];
      if(unsupported.length===0)pass('no active lead lacks evidence/counter-evidence',`${leads.count??0} active records; no incomplete records`);
      else fail('no active lead lacks evidence/counter-evidence',`${unsupported.length} active records lack required evidence fields`);
      if(leads.count>0)pass('evidence-qualified lead records exist',`${leads.count} active records`);
      else fail('evidence-qualified lead records exist','No active evidence-qualified leads; current app must not invent them');
    } catch { fail('active leads have evidence and counter-evidence', 'Lead evidence query failed or required schema is unavailable'); }
  } catch (error) { fail('database-backed research checks', error.message); }
}

console.log(`Signal Scout production verification: ${base}`);
for (const gate of gates) console.log(`${gate.ok ? 'PASS' : 'FAIL'} ${gate.name}: ${gate.detail}`);
const failed = gates.filter(g=>!g.ok).length;
console.log(`\n${gates.length-failed}/${gates.length} checks passed; ${failed} release gates remain.`);
if (failed) process.exitCode = 1;

function matchesDiscussionTitle(title, query) {
  if (!title || typeof query !== 'string') return false;
  const tokens = value => value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const expected = tokens(query);
  const present = new Set(tokens(title));
  return expected.length > 0 && expected.every(token => present.has(token));
}
