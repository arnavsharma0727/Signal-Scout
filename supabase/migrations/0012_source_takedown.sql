-- Operator-only source takedown with a durable, content-free blocklist.
create table if not exists source_takedown_blocks (
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  fingerprint_type text not null check (fingerprint_type in ('content','url')),
  reason_code text not null check (reason_code in ('rights_request','privacy_request','operator_review')),
  created_at timestamptz not null default now(),
  primary key (fingerprint, fingerprint_type)
);

create table if not exists source_takedown_events (
  id bigint generated always as identity primary key,
  source_document_id uuid,
  fingerprint_type text,
  fingerprint text,
  reason_code text not null check (reason_code in ('rights_request','privacy_request','operator_review')),
  outcome text not null check (outcome in ('deleted','not_found')),
  created_at timestamptz not null default now(),
  check ((fingerprint is null and fingerprint_type is null) or
         (fingerprint ~ '^[a-f0-9]{64}$' and fingerprint_type in ('content','url')))
);

alter table source_takedown_blocks enable row level security;
alter table source_takedown_events enable row level security;
revoke all on source_takedown_blocks from anon, authenticated;
revoke all on source_takedown_events from anon, authenticated;
grant all on source_takedown_blocks to service_role;
grant all on source_takedown_events to service_role;

alter table document_analyses
  drop constraint if exists document_analyses_document_id_fkey;
alter table document_analyses
  add constraint document_analyses_document_id_fkey
  foreign key (document_id) references source_documents(id) on delete cascade;

alter table research_lead_documents
  drop constraint if exists research_lead_documents_document_id_fkey;
alter table research_lead_documents
  add constraint research_lead_documents_document_id_fkey
  foreign key (document_id) references source_documents(id) on delete cascade;

create or replace function process_source_takedown(p_document_id uuid, p_reason_code text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_row source_documents%rowtype;
  entity_ids uuid[];
  lead_ids uuid[];
  url_fingerprint text;
begin
  if p_reason_code not in ('rights_request','privacy_request','operator_review') then
    raise exception 'invalid_reason_code';
  end if;

  select * into source_row from source_documents where id = p_document_id for update;
  if not found then
    insert into source_takedown_events(source_document_id, reason_code, outcome)
      values (p_document_id, p_reason_code, 'not_found');
    return 'not_found';
  end if;

  select array_agg(distinct affected.company_id) into entity_ids
    from (
      select company_id from document_entities where document_id = p_document_id
      union
      select source_row.company_id where source_row.company_id is not null
    ) as affected;
  select array_agg(distinct research_lead_id) into lead_ids
    from research_lead_documents where document_id = p_document_id;

  if source_row.content_hash is not null and source_row.content_hash ~ '^[a-f0-9]{64}$' then
    insert into source_takedown_blocks(fingerprint, fingerprint_type, reason_code)
      values (source_row.content_hash, 'content', p_reason_code)
      on conflict (fingerprint, fingerprint_type) do update
        set reason_code = excluded.reason_code;
  end if;
  if coalesce(source_row.canonical_url, source_row.source_url) is not null then
    url_fingerprint := encode(extensions.digest(coalesce(source_row.canonical_url, source_row.source_url), 'sha256'), 'hex');
    insert into source_takedown_blocks(fingerprint, fingerprint_type, reason_code)
      values (url_fingerprint, 'url', p_reason_code)
      on conflict (fingerprint, fingerprint_type) do update
        set reason_code = excluded.reason_code;
  end if;

  if lead_ids is not null then
    delete from research_leads where id = any(lead_ids);
  end if;
  if entity_ids is not null then
    delete from candidate_events
      where company_id = any(entity_ids) and market_code is not distinct from source_row.market_code;
    delete from topic_observations
      where company_id = any(entity_ids) and market_code is not distinct from source_row.market_code;
    delete from cross_market_divergences
      where company_id = any(entity_ids)
        and (local_market_code is not distinct from source_row.market_code
          or comparison_market_code is not distinct from source_row.market_code);
    if source_row.published_at is not null then
      delete from metrics_daily
        where company_id = any(entity_ids)
          and market_code is not distinct from source_row.market_code
          and source_type = source_row.source_type
          and metric_date between source_row.published_at::date and source_row.published_at::date + 30;
    end if;
  end if;

  delete from source_documents where id = p_document_id;
  insert into source_takedown_events(source_document_id, reason_code, outcome)
    values (p_document_id, p_reason_code, 'deleted');
  return 'deleted';
end;
$$;

revoke all on function process_source_takedown(uuid, text) from public, anon, authenticated;
grant execute on function process_source_takedown(uuid, text) to service_role;

create or replace function reject_takedown_blocked_source_document()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.content_hash is not null and exists (
    select 1 from source_takedown_blocks
    where fingerprint_type = 'content' and fingerprint = new.content_hash
  ) then
    raise exception 'source_document_blocked_by_takedown';
  end if;
  if coalesce(new.canonical_url, new.source_url) is not null and exists (
    select 1 from source_takedown_blocks
    where fingerprint_type = 'url'
      and fingerprint = encode(extensions.digest(coalesce(new.canonical_url, new.source_url), 'sha256'), 'hex')
  ) then
    raise exception 'source_document_blocked_by_takedown';
  end if;
  return new;
end;
$$;

revoke all on function reject_takedown_blocked_source_document() from public, anon, authenticated;
create trigger source_documents_takedown_guard
  before insert or update on source_documents
  for each row execute function reject_takedown_blocked_source_document();
