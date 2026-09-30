import 'server-only';
import {serverSupabase} from './server-supabase';

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
  const markets=await Promise.all(['KR','US'].map(async market=>{
    const {data}=await db.from('source_documents')
      .select('id,market_code,source_type,source_name,language_code,title_original,excerpt_original,source_url,published_at,discovered_at')
      .eq('market_code',market)
      .gte('published_at',since)
      .order('published_at',{ascending:false})
      .limit(60);
    return data??[];
  }));
  return markets.flat().sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}
