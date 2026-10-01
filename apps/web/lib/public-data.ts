import 'server-only';
import {serverSupabase} from './server-supabase';
import {isPublicEvidenceEligible, matchesStackExchangeTitleQuery} from './source-policy';
import {buildDiscussionObservations} from './discussion-observations';

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
      .neq('source_domain','news.google.com')
      .gte('published_at',since)
      .order('published_at',{ascending:false})
      .limit(60);
    return data??[];
  }));
  return markets.flat().filter(row=>
    isPublicEvidenceEligible(row.source_type,row.source_domain) &&
    (row.source_type !== 'stack-exchange' || matchesStackExchangeTitleQuery(
      row.title_original,
      row.raw_metadata_json?.query,
    ))
  ).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
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
  }
  return buildDiscussionObservations(rows);
}
