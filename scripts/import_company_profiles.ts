import fs from 'node:fs';
import path from 'node:path';
import {parse as parseCsv} from 'csv-parse/sync';
import YAML from 'yaml';
import {createClient} from '@supabase/supabase-js';
import {validateProfile} from './validate_company_profiles';

function split(value?:string){return value?value.split('|').map(v=>v.trim()).filter(Boolean):[]}
function parseJson(value:string|undefined,fallback:unknown){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function readProfiles(file:string):unknown[]{
  const text=fs.readFileSync(file,'utf8'),ext=path.extname(file).toLowerCase();
  if(ext==='.yaml'||ext==='.yml'){const value=YAML.parse(text);return Array.isArray(value)?value:[value]}
  if(ext==='.json'){const value=JSON.parse(text);return Array.isArray(value)?value:[value]}
  if(ext==='.csv')return parseCsv(text,{columns:true,skip_empty_lines:true,relax_column_count:true}).map((row:Record<string,string>)=>({
    ...row,krx_code:row.krx_code||'',name_ko:row.name_ko||'',aliases_en:split(row.aliases_en),aliases_ko:split(row.aliases_ko),topics_of_interest:split(row.topics_of_interest),related_entities:parseJson(row.related_entities,'[]'),
    is_active:row.is_active!=='false',priority_tier:Number(row.priority_tier||3),
    markets:[{market_code:row.market_code,language_code:row.language_code,company_aliases:split(row.company_aliases),negative_aliases:split(row.negative_aliases),products_games_apps_brands:split(row.products_games_apps_brands),competitor_aliases:split(row.competitor_aliases),event_terms:parseJson(row.event_terms,'{}'),source_preferences:split(row.source_preferences),ambiguity_notes:split(row.ambiguity_notes),enabled:row.enabled!=='false'}],
  }));
  throw new Error(`Unsupported profile format: ${ext}`);
}

async function main(){
  const file=process.argv[2];
  if(!file){console.error('Usage: npm run import-profiles -- path/to/profiles.yaml [--apply]');process.exit(1)}
  const profiles=readProfiles(file),reports=profiles.map(validateProfile);
  console.log(JSON.stringify({file,profiles:reports.length,reports},null,2));
  if(reports.some(report=>!report.valid)||!process.argv.includes('--apply')){if(!process.argv.includes('--apply'))console.log('Dry run only. Add --apply after fixing validation errors to upsert.');process.exit(reports.some(report=>!report.valid)?1:0)}
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply');
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}),companyIds=new Map<string,string>();
  for(let index=0;index<profiles.length;index++){
    const profile=profiles[index] as any;
    const {data:company,error}=await db.from('companies').upsert({ticker:profile.ticker,cik:profile.cik||null,company_name_en:profile.company_name_en,name_ko:profile.name_ko||null,krx_code:profile.krx_code||null,aliases_en_json:profile.aliases_en,aliases_ko_json:profile.aliases_ko,topics_of_interest_json:profile.topics_of_interest,vertical:profile.vertical,exchange:profile.exchange,description:profile.description||null,priority_tier:profile.priority_tier,profile_completeness_score:reports[index].score,is_active:profile.is_active},{onConflict:'ticker'}).select('id').single();
    if(error)throw new Error(`Company upsert failed for ${profile.ticker}`);
    companyIds.set(profile.ticker,company.id);
    const {error:marketError}=await db.from('company_market_profiles').upsert(profile.markets.map((market:any)=>({company_id:company.id,market_code:market.market_code,language_code:market.language_code,company_aliases_json:market.company_aliases,negative_aliases_json:market.negative_aliases,products_games_apps_brands_json:market.products_games_apps_brands,competitor_aliases_json:market.competitor_aliases,event_terms_json:market.event_terms,ambiguity_notes:market.ambiguity_notes,source_preferences_json:market.source_preferences,enabled:market.enabled})),{onConflict:'company_id,market_code,language_code'});
    if(marketError)throw new Error(`Market profile upsert failed for ${profile.ticker}`);
  }
  for(const input of profiles as any[]){
    for(const relation of input.related_entities){
      let targetId=companyIds.get(relation.ticker);
      if(!targetId){const {data}=await db.from('companies').select('id').eq('ticker',relation.ticker).maybeSingle();targetId=data?.id}
      const sourceId=companyIds.get(input.ticker);
      if(!targetId||!sourceId)throw new Error(`Related entity ${relation.ticker} for ${input.ticker} is not present in the database`);
      const {error}=await db.from('entity_links').upsert({source_company_id:sourceId,target_company_id:targetId,relationship_type:relation.relationship_type,evidence_note:relation.evidence_note||null},{onConflict:'source_company_id,target_company_id,relationship_type'});
      if(error)throw new Error(`Relationship upsert failed for ${input.ticker} → ${relation.ticker}`);
    }
  }
  console.log('Applied validated profile upserts. Existing market profiles, relationships, and historical source records were preserved.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Profile import failed');process.exit(1)});
