-- The service-role server client bypasses RLS. Browser/anon/authenticated roles
-- should not read or mutate operational state, caches, budgets, or future private lists.
alter table company_import_runs enable row level security;
alter table document_analyses enable row level security;
alter table connector_runs enable row level security;
alter table source_query_cache enable row level security;
alter table query_budgets enable row level security;
alter table watchlists enable row level security;
alter table watchlist_companies enable row level security;

-- Lead evidence links intentionally back public, evidence-qualified lead pages.
alter table research_lead_documents enable row level security;
drop policy if exists "public read lead document links" on research_lead_documents;
create policy "public read lead document links"
  on research_lead_documents for select using (true);
