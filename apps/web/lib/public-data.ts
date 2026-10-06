import 'server-only';
import {serverSupabase} from './server-supabase';
import {isPublicEvidenceEligible, matchesStackExchangeTitleQuery} from './source-policy';
import {buildDiscussionObservations} from './discussion-observations';
import {WIKIMEDIA_TALK_WIKIS} from './wikimedia-talk';
import {buildDiscussionReportingOverlaps} from './discussion-reporting-overlaps';
import {toPublisherEvidence} from './publisher-evidence';

export async function publishedDivergences(){
  const db=serverSupabase();
  if(!db)return [];
  const {data}=await db.from('cross_market_divergences').select('*').eq('status','research_starting_point').order('research_priority_score',{ascending:false}).limit(50);
  return data??[];
}

export async function recentSourceDocuments(){
  const db=serverSupabase();
  if(!db)return [];
  const since=new Date(Date.now()-72*60*60*1000).toISOString();
  const markets=await Promise.all(['KR','US','INTL'].map(async market=>{
    const {data}=await db.from('source_documents')
      .select('id,market_code,source_type,source_name,source_domain,language_code,title_original,excerpt_original,source_url,published_at,discovered_at,raw_metadata_json')
      .eq('market_code',market)
      .neq('source_type','hacker-news')
      .neq('source_type','wikimedia-talk')
      .neq('source_domain','news.google.com')
      .gte('published_at',since)
      .order('published_at',{ascending:false})
      .limit(60);
    return data??[];
  }));
  const wikimedia = await Promise.all(WIKIMEDIA_TALK_WIKIS.map(async edition => {
    const {data}=await db.from('source_documents')
      .select('id,market_code,source_type,source_name,source_domain,language_code,title_original,excerpt_original,source_url,published_at,discovered_at,raw_metadata_json')
      .eq('market_code','INTL')
      .eq('source_type','wikimedia-talk')
      .eq('source_name',`Wikimedia · ${edition.wiki} talk pages`)
      .gte('published_at',since)
      .order('published_at',{ascending:false})
      .limit(5);
    return data??[];
  }));
  return [...markets.flat(), ...wikimedia.flat()].filter(row=>
    isPublicEvidenceEligible(row.source_type,row.source_domain) &&
    (row.source_type !== 'stack-exchange' || matchesStackExchangeTitleQuery(
      row.title_original,
      row.raw_metadata_json?.query,
    ))
  ).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}

/** Recent, rights-reviewed publisher-feed headlines for the public Explorer; never selects stored body/excerpt fields. */
export async function recentPublisherEvidence(){
  const db=serverSupabase();
  if(!db)return [];
  const since=new Date(Date.now()-72*60*60*1000).toISOString();
  const fields='id,source_type,source_name,source_domain,language_code,title_original,source_url,published_at,raw_metadata_json';
  const [publishers,questions]=await Promise.all([
    db.from('source_documents').select(fields)
      .eq('market_code','INTL')
      .in('source_type',['licensed-analysis','licensed-reporting','licensed-forum'])
      .gte('published_at',since).order('published_at',{ascending:false}).limit(90),
    db.from('source_documents').select(fields)
      .eq('market_code','INTL').eq('source_type','stack-exchange')
      .gte('published_at',since).order('published_at',{ascending:false}).limit(30),
  ]);
  if(publishers.error||questions.error||!publishers.data||!questions.data)return [];
  return [...publishers.data,...questions.data]
    .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at))
    .flatMap(row=>{
    const evidence=toPublisherEvidence(row);
    return evidence?[evidence]:[];
  });
}

export async function recentDiscussionObservations(){
  const db=serverSupabase();
  if(!db)return null;
  const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
  const rows=[];
  const pageSize=1000;
  for(let offset=0;offset<5000;offset+=pageSize){
    const {data,error}=await db.from('source_documents')
      .select('id,source_type,source_name,title_original,source_url,published_at,raw_metadata_json')
      .eq('source_type','stack-exchange')
      .gte('published_at',since)
      .order('published_at',{ascending:true})
      .order('id',{ascending:true})
      .range(offset,offset+pageSize-1);
    if(error||!data)return null;
    rows.push(...data);
    if(data.length<pageSize)break;
    if(offset===4000)return null;
  }
  return buildDiscussionObservations(rows.filter(row =>
    matchesStackExchangeTitleQuery(row.title_original, row.raw_metadata_json?.query)
  ));
}

/** Temporary, literal same-language overlaps between reviewed forum/Q&A discussion and licensed reporting. */
export async function recentDiscussionReportingOverlaps(){
  const db=serverSupabase();
  if(!db)return null;
  const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
  const fields='id,source_type,source_name,source_domain,language_code,title_original,source_url,published_at,raw_metadata_json';
  const [questions,reports]=await Promise.all([
    recentRows(db,fields,['stack-exchange','licensed-forum'],since),
    recentRows(db,fields,['licensed-analysis','licensed-reporting'],since),
  ]);
  if(!questions||!reports)return null;
  return buildDiscussionReportingOverlaps([...questions,...reports]);
}

async function recentRows(db: NonNullable<ReturnType<typeof serverSupabase>>, fields: string, types: string[], since: string) {
  const pageSize=1000, maxPages=10, rows: any[]=[];
  for(let page=0;page<maxPages;page++){
    const offset=page*pageSize;
    const {data,error}=await db.from('source_documents').select(fields).in('source_type',types)
      .gte('published_at',since).order('published_at',{ascending:false}).order('id',{ascending:false})
      .range(offset,offset+pageSize-1);
    if(error||!data)return null;
    rows.push(...data);
    if(data.length<pageSize)return rows;
  }
  return null;
}
