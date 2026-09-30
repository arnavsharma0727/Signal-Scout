import 'server-only';
import {serverSupabase} from './server-supabase';

export async function publishedDivergences(){
  const db=serverSupabase();
  if(!db)return [];
  const {data}=await db.from('cross_market_divergences').select('*').eq('status','research_starting_point').order('research_priority_score',{ascending:false}).limit(50);
  return data??[];
}
