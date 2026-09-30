alter table companies
  add column if not exists name_ko text,
  add column if not exists krx_code text,
  add column if not exists aliases_en_json jsonb not null default '[]'::jsonb,
  add column if not exists aliases_ko_json jsonb not null default '[]'::jsonb,
  add column if not exists topics_of_interest_json jsonb not null default '[]'::jsonb;

alter table company_market_profiles
  add column if not exists negative_aliases_json jsonb not null default '[]'::jsonb;

create table if not exists entity_links (
  id uuid primary key default gen_random_uuid(),
  source_company_id uuid not null references companies(id),
  target_company_id uuid not null references companies(id),
  relationship_type text not null,
  evidence_note text,
  created_at timestamptz not null default now(),
  unique(source_company_id,target_company_id,relationship_type),
  check(source_company_id<>target_company_id)
);
create index if not exists entity_links_source_idx on entity_links(source_company_id);
create index if not exists entity_links_target_idx on entity_links(target_company_id);
alter table entity_links enable row level security;
create policy "public read entity links" on entity_links for select using (true);

create table if not exists document_entities (
  document_id uuid not null references source_documents(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  match_method text not null,
  matched_alias text not null,
  match_confidence numeric,
  created_at timestamptz not null default now(),
  primary key(document_id,company_id)
);
create index if not exists document_entities_company_idx on document_entities(company_id,created_at desc);
alter table document_entities enable row level security;
create policy "public read document entity matches" on document_entities for select using (true);

-- The legacy broad market-context profile is not a company/entity assignment.
update source_documents set company_id=null
where company_id in (select id from companies where ticker='MARKET-TALK');
