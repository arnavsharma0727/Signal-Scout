create table if not exists metrics_daily (
  metric_date date not null,
  company_id uuid not null references companies(id) on delete cascade,
  market_code text not null,
  source_type text not null,
  document_count integer not null default 0 check (document_count >= 0),
  unique_content_hash_count integer not null default 0 check (unique_content_hash_count >= 0),
  independent_domain_count integer not null default 0 check (independent_domain_count >= 0),
  effective_domain_sample_size numeric not null default 0 check (effective_domain_sample_size >= 0),
  first_seen_in_window_utc timestamptz,
  topic_stance_mix_json jsonb,
  baseline_observed_days smallint not null default 0 check (baseline_observed_days >= 0),
  trailing_30d_document_median numeric,
  trailing_30d_document_mad numeric,
  evidence_status text not null check (evidence_status in ('insufficient','descriptive_only')),
  computed_at timestamptz not null default now(),
  primary key (metric_date, company_id, market_code, source_type)
);

create index if not exists metrics_daily_entity_date_idx
  on metrics_daily(company_id, metric_date desc);
alter table metrics_daily enable row level security;
create policy "public read daily evidence metrics" on metrics_daily for select using (true);
