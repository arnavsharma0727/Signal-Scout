import 'server-only';
import {serverSupabase} from './server-supabase';
import {isPublicEvidenceEligible} from './source-policy';
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
  return markets.flat().filter(row=>isPublicEvidenceEligible(row.source_type,row.source_domain)).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}

export async function recentDiscussionObservations(){
  return buildDiscussionObservations(await recentSourceDocuments());
}
