with watch as (
  insert into companies (
    ticker, company_name_en, vertical, exchange, description,
    priority_tier, profile_completeness_score, is_active
  ) values (
    'MARKET-TALK',
    'Korea–U.S. Market Conversation',
    'consumer_platforms',
    'MULTI',
    'A broad research watch for public Korean and U.S. market conversation. This is not a listed company or a trading signal.',
    1,
    100,
    true
  )
  on conflict (ticker) do update set
    company_name_en = excluded.company_name_en,
    vertical = excluded.vertical,
    exchange = excluded.exchange,
    description = excluded.description,
    priority_tier = excluded.priority_tier,
    profile_completeness_score = excluded.profile_completeness_score,
    is_active = excluded.is_active,
    updated_at = now()
  returning id
)
insert into company_market_profiles (
  company_id, market_code, language_code, company_aliases_json,
  products_games_apps_brands_json, competitor_aliases_json,
  event_terms_json, ambiguity_notes, source_preferences_json, enabled
)
select id, 'KR', 'ko',
  '["주식시장","증시","코스피","코스닥","환율","원화","금리","수출","반도체","투자자"]'::jsonb,
  '["한국 금융시장 대화","거시경제","시장 심리"]'::jsonb,
  '[]'::jsonb,
  '{"macro":["금리","환율","원화","수출"],"markets":["증시","코스피","코스닥"],"technology":["반도체","인공지능"]}'::jsonb,
  '["Broad market-level terms can be ambiguous; inspect original source context before interpretation."]'::jsonb,
  '["rss","gdelt"]'::jsonb,
  true
from watch
on conflict (company_id, market_code, language_code) do update set
  company_aliases_json = excluded.company_aliases_json,
  products_games_apps_brands_json = excluded.products_games_apps_brands_json,
  competitor_aliases_json = excluded.competitor_aliases_json,
  event_terms_json = excluded.event_terms_json,
  ambiguity_notes = excluded.ambiguity_notes,
  source_preferences_json = excluded.source_preferences_json,
  enabled = excluded.enabled,
  updated_at = now();

with watch as (
  select id from companies where ticker = 'MARKET-TALK'
)
insert into company_market_profiles (
  company_id, market_code, language_code, company_aliases_json,
  products_games_apps_brands_json, competitor_aliases_json,
  event_terms_json, ambiguity_notes, source_preferences_json, enabled
)
select id, 'US', 'en',
  '["stock market","investors","interest rates","inflation","tariffs","semiconductors","artificial intelligence","Korean won","exports","economy"]'::jsonb,
  '["U.S. financial market discussion","macroeconomics","market sentiment"]'::jsonb,
  '[]'::jsonb,
  '{"macro":["interest rates","inflation","currency","exports"],"markets":["stocks","investors","market"],"technology":["semiconductors","artificial intelligence"]}'::jsonb,
  '["Broad market-level terms can be ambiguous; inspect original source context before interpretation."]'::jsonb,
  '["rss","hacker-news","gdelt"]'::jsonb,
  true
from watch
on conflict (company_id, market_code, language_code) do update set
  company_aliases_json = excluded.company_aliases_json,
  products_games_apps_brands_json = excluded.products_games_apps_brands_json,
  competitor_aliases_json = excluded.competitor_aliases_json,
  event_terms_json = excluded.event_terms_json,
  ambiguity_notes = excluded.ambiguity_notes,
  source_preferences_json = excluded.source_preferences_json,
  enabled = excluded.enabled,
  updated_at = now();
