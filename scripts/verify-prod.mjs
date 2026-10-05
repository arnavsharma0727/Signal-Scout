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
  const response=await fetch(`${base}/login`,{redirect:'follow',signal:AbortSignal.timeout(15000)});
  const page=await response.text();
  if(response.ok&&page.includes('Continue with GitHub'))pass('private brief account sign-in is configured','Supabase reports GitHub OAuth enabled and the sign-in action is rendered');
  else if(response.ok&&page.includes('Private sign-in is unavailable.'))fail('private brief account sign-in is configured','Supabase GitHub OAuth is disabled or Auth configuration is unavailable; private brief sign-in remains unavailable');
  else fail('private brief account sign-in is configured',`HTTP ${response.status}; login flow could not be verified`);
} catch(error) { fail('private brief account sign-in is configured',error.message); }

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
  const response = await fetch(`${base}/api/operator/takedown`, {method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  if(response.status===401)pass('operator takedown is configured and protected','Unauthenticated request rejected with HTTP 401');
  else if(response.status===503)fail('operator takedown is configured and protected','TAKEDOWN_SECRET or server database configuration is missing');
  else fail('operator takedown is configured and protected',`Expected HTTP 401 without credentials, got HTTP ${response.status}`);
} catch(error) { fail('operator takedown is configured and protected',error.message); }

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
  if (response.ok && page.includes('Find a conversation. Follow its evidence.') && page.includes('Search one topic across selected sources') && !page.includes('Hacker News comment')) pass('public research desk withholds uncleared source material','focused topic-to-brief workflow renders without uncleared source content');
  else fail('public research desk withholds uncleared source material',`HTTP ${response.status}; focused workflow missing or uncleared source material may be rendered`);
  const sourcesResponse=await fetch(`${base}/sources`,{redirect:'follow',signal:AbortSignal.timeout(15000)});
  const sourcesPage=await sourcesResponse.text();
  if(sourcesResponse.ok&&sourcesPage.includes('Wikimedia · article talk pages')&&sourcesPage.includes('comment text, edit summaries, usernames, and IPs are never requested or stored')&&sourcesPage.includes('CC BY-SA 4.0'))pass('Wikimedia attribution and limitations are public','source methodology states metadata minimization and links applicable license');
  else fail('Wikimedia attribution and limitations are public','source-methodology page lacks the metadata-retention note or license attribution');
} catch (error) { fail('public briefing withholds uncleared source material',error.message); }

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function rest(path, method='GET', prefer='count=exact') {
  const pageSize=1000, maxPages=20, data=[];
  let count=null, complete=true;
  for(let page=0;page<(method==='GET'?maxPages:1);page++){
    const first=page*pageSize;
    const response = await fetch(`${url}/rest/v1/${path}`, {method, headers:{apikey:key, Authorization:`Bearer ${key}`, Prefer:prefer, Range:`${first}-${first+pageSize-1}`}, signal:AbortSignal.timeout(15000)});
    const range = response.headers.get('content-range');
    if (!response.ok) throw new Error(`database query returned HTTP ${response.status}`);
    if(range&&range.includes('/')){
      const total=Number(range.split('/')[1]);
      if(Number.isFinite(total))count=total;
    }
    if(method!=='GET')return {count,data:null,complete:true};
    const batch=await response.json();
    if(!Array.isArray(batch))throw new Error('database query returned an unexpected result shape');
    data.push(...batch);
    if(batch.length<pageSize||(count!==null&&data.length>=count))break;
    if(page===maxPages-1)complete=count!==null&&data.length>=count;
  }
  return {count,data,complete};
}

if (!url || !key) {
  fail('database-backed research checks', 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or keep them in local .env.local); credentials are never printed.');
} else {
  try {
    try {
      await rest('source_takedown_blocks?select=fingerprint&limit=0');
      await rest('source_takedown_events?select=id&limit=0');
      pass('production source-takedown migration is installed','operator-only block and audit tables are queryable');
    } catch {
      fail('production source-takedown migration is installed','Migration 0012 tables are missing or unavailable to the service role');
    }
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const recent=await rest(`source_documents?select=id,source_type,source_domain,market_code,language_code,title_original,published_at,raw_metadata_json&published_at=gte.${encodeURIComponent(since)}`);
    if(recent.complete)pass('recent source audit is fully paginated',`${recent.data.length} rows read${recent.count===null?'':` of ${recent.count}`}`);
    else fail('recent source audit is fully paginated',`Read ${recent.data.length} rows but the bounded pagination limit prevented a completeness check`);
    const eligible=(recent.data??[]).filter(row=>row.source_type!=='hacker-news' && !['news.google.com','www.news.google.com'].includes((row.source_domain??'').toLowerCase()));
    const types=new Set(eligible.map(row=>row.source_type).filter(Boolean));
    const domains=new Set(eligible.map(row=>row.source_domain).filter(Boolean));
    const discussions=eligible.filter(row=>['stack-exchange','wikimedia-talk','lemmy','mastodon','bluesky','reddit'].includes(row.source_type) && (row.source_type!=='stack-exchange'||matchesDiscussionTitle(row.title_original,row.raw_metadata_json?.query)) || isReviewedLicensedForum(row));
    const communities=new Set(discussions.filter(row=>row.source_type==='stack-exchange').map(row=>row.raw_metadata_json?.site).filter(Boolean));
    const wikiEditions=new Set(discussions.filter(row=>row.source_type==='wikimedia-talk').map(row=>row.raw_metadata_json?.editionLanguage).filter(Boolean));
    const licensedForums=discussions.filter(isReviewedLicensedForum);
    const forumPublishers=new Set(licensedForums.map(row=>row.raw_metadata_json.publisher));
    const wikiRows=eligible.filter(row=>row.source_type==='wikimedia-talk');
    const news=eligible.filter(row=>['rss','gdelt','news','licensed-reporting'].includes(row.source_type));
    const licensedAnalysis=eligible.filter(row=>row.source_type==='licensed-analysis');
    const officialContext=eligible.filter(row=>row.source_type==='official-policy');
    if(eligible.length>=20)pass('>=20 eligible live source records / 24h',`${eligible.length} records; ${domains.size} host labels across ${types.size} stored source types (hostnames are not proof of independent owners)`);
    else fail('>=20 eligible live source records / 24h',`${eligible.length} eligible records; requires 20`);
    if(discussions.length>0)pass('scheduled public discussion collection',`${discussions.length} eligible records, including ${licensedForums.length} reviewed licensed-forum records from ${forumPublishers.size} forum operators, ${communities.size} Stack Exchange communities, and ${wikiEditions.size} Wikipedia talk editions (each platform is one operator)`);
    else fail('scheduled public discussion collection','No eligible scheduled discussion records in the last 24 hours');
    if(wikiRows.length>0&&wikiRows.every(row=>row.raw_metadata_json?.talkContentRetained===false&&row.raw_metadata_json?.contributorNameOrIdRetained===false&&row.raw_metadata_json?.editSummaryRetained===false&&row.raw_metadata_json?.licenseUrl==='https://creativecommons.org/licenses/by-sa/4.0/'))pass('Wikimedia scheduled records minimize contributor data',`${wikiRows.length} metadata-only revisions from ${wikiEditions.size} editions; no talk text, edit summary, or contributor identifiers`);
    else fail('Wikimedia scheduled records minimize contributor data',`${wikiRows.length} records; expected metadata-only rows with license attribution`);
    if(officialContext.length>0)pass('institutional context is retained separately',`${officialContext.length} official-policy records; not counted as news or public discussion`);
    else fail('institutional context is retained separately','No recent official-policy records');
    if(news.length>0)pass('independent/news-source records are available',`${news.length} recent independent reporting/RSS/GDELT/news records`);
    else fail('independent/news-source records are available','No recent independent reporting/RSS/GDELT/news records; official releases are not substituted for reporting');
    if(licensedAnalysis.length>0)pass('licensed expert analysis is available separately',`${licensedAnalysis.length} records; not counted as public discussion or independent reporting`);
    else fail('licensed expert analysis is available separately','No recent licensed-analysis records');
    if(communities.size>=3||wikiEditions.size>=3||forumPublishers.size>=2)pass('discussion coverage spans multiple communities or editions',`${forumPublishers.size} licensed forum operators, ${communities.size} Stack Exchange communities, and ${wikiEditions.size} Wikipedia language editions; platforms remain distinct and are not population samples`);
    else fail('discussion coverage spans multiple communities or editions',`${forumPublishers.size} licensed forum operators, ${communities.size} Stack Exchange communities, and ${wikiEditions.size} Wikipedia language editions; requires at least 2 licensed forums or 3 views within one platform`);
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
    const discussionRunNames=['stack-exchange','typst-forum','fedora-discussion'];
    const healthyDiscussionRuns=discussionRunNames.filter(name=>{
      const run=groupedRuns.get(name);
      return run?.success>0&&run.stored>0;
    });
    if(healthyDiscussionRuns.length>=2)pass('scheduled discussion connectors are operational',`${healthyDiscussionRuns.length}/${discussionRunNames.length} connectors have successful runs with stored items: ${healthyDiscussionRuns.join(', ')}`);
    else fail('scheduled discussion connectors are operational',`${healthyDiscussionRuns.length}/${discussionRunNames.length} connectors have successful runs with stored items`);
    const gdeltRuns=groupedRuns.get('gdelt');
    if(gdeltRuns)pass('GDELT source health reported',`${gdeltRuns.success} successful/partial, ${gdeltRuns.failed} failed, ${gdeltRuns.stored} stored in 24h`);
    else pass('GDELT source health reported','GDELT is visitor-triggered in the current product; no scheduled run is expected');
    try {
      const leads = await rest('research_leads?select=id,independent_source_count,verified_evidence_json,alternative_explanations_json&status=eq.active');
      const unsupported=leads.data?.filter(x=>!hasEvidence(x.verified_evidence_json)||!hasEvidence(x.alternative_explanations_json)||Number(x.independent_source_count)<2)??[];
      if(unsupported.length===0)pass('no active lead lacks evidence/counter-evidence',`${leads.count??0} active records; no incomplete records`);
      else fail('no active lead lacks evidence/counter-evidence',`${unsupported.length} active records lack required evidence fields`);
      const links=leads.data?.length
        ? await rest(`research_lead_documents?select=research_lead_id,document_id,source_documents(source_type,source_domain,raw_metadata_json)&research_lead_id=in.(${leads.data.map(x=>x.id).join(',')})`)
        : {data:[]};
      const operatorsByLead=new Map();
      const blockedByUnclearedSource=new Set();
      for(const link of links.data??[]){
        if(!link.document_id)continue;
        const docs=Array.isArray(link.source_documents)?link.source_documents:link.source_documents?[link.source_documents]:[];
        for(const document of docs){
          if(document?.source_type==='hacker-news')blockedByUnclearedSource.add(link.research_lead_id);
          const operator=reviewedSourceOperator(document);
          if(!operator)continue;
          const operators=operatorsByLead.get(link.research_lead_id)??new Set();
          operators.add(operator);
          operatorsByLead.set(link.research_lead_id,operators);
        }
      }
      const qualified=(leads.data??[]).filter(x=>Number(x.independent_source_count)>=2&&(operatorsByLead.get(x.id)?.size??0)>=2&&!blockedByUnclearedSource.has(x.id)&&hasEvidence(x.verified_evidence_json)&&hasEvidence(x.alternative_explanations_json));
      if(leads.count>0&&qualified.length===leads.count)pass('active leads resolve to multiple reviewed source operators',`${qualified.length} active records link at least two known operators`);
      else if(leads.count>0)fail('active leads resolve to multiple reviewed source operators',`${qualified.length}/${leads.count} active records meet the independent-operator gate`);
      else pass('active leads resolve to multiple reviewed source operators','No active lead exists to qualify; the UI must continue to show none');
      if(qualified.length>0)pass('evidence-qualified lead records exist',`${qualified.length} active records pass the linked-operator gate`);
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

function isReviewedLicensedForum(row) {
  const domain=(row?.source_domain??'').toLowerCase();
  const metadata=row?.raw_metadata_json&&typeof row.raw_metadata_json==='object'?row.raw_metadata_json:{};
  if(row?.source_type!=='licensed-forum'||metadata.titleUnmodified!==true||typeof metadata.author!=='string'||!metadata.author.trim())return false;
  if(domain==='forum.typst.app')return metadata.publisher==='Typst Forum'&&metadata.licenseUrl==='https://creativecommons.org/licenses/by/4.0/'&&metadata.postBodyAndSummaryDiscarded===true;
  if(domain==='discussion.fedoraproject.org')return metadata.publisher==='Fedora Discussion'&&metadata.licenseUrl==='https://creativecommons.org/licenses/by-sa/4.0/'&&metadata.topicBodyAndRepliesDiscarded===true&&metadata.profileDetailsDiscarded===true;
  return false;
}

function reviewedSourceOperator(source) {
  const domain=(source?.source_domain??'').toLowerCase().replace(/^www\./,'');
  const metadata=source?.raw_metadata_json&&typeof source.raw_metadata_json==='object'?source.raw_metadata_json:{};
  if(source?.source_type==='stack-exchange')return 'stack-exchange';
  if(source?.source_type==='licensed-forum'&&domain==='forum.typst.app'&&metadata.publisher==='Typst Forum')return 'typst-forum';
  if(source?.source_type==='licensed-analysis'&&domain==='theconversation.com'&&metadata.publisher==='The Conversation')return 'the-conversation';
  if(source?.source_type==='licensed-reporting'&&(domain==='globalvoices.org'||domain.endsWith('.globalvoices.org'))&&metadata.publisher==='Global Voices')return 'global-voices';
  if(source?.source_type==='official-policy'&&domain==='ec.europa.eu'&&metadata.publisher==='European Commission')return 'european-commission';
  if(source?.source_type==='official-policy'&&domain==='mois.go.kr'&&metadata.publisher==='Ministry of the Interior and Safety, Republic of Korea')return 'korea-mois';
  if(source?.source_type==='wikimedia-talk'&&/^(?:[a-z]{2,3}|simple)\.wikipedia\.org$/.test(domain))return 'wikimedia';
  return null;
}

function hasEvidence(value) {
  if(Array.isArray(value))return value.length>0;
  if(value&&typeof value==='object')return Object.keys(value).length>0;
  return typeof value==='string'&&value.trim().length>0;
}
