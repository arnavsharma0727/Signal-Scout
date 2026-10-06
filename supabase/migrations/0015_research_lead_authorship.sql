-- Attribute newly published human-reviewed leads so authors can withdraw
-- their own public records. Existing operator-created rows remain unchanged.
alter table research_leads
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists research_leads_author_active_idx
  on research_leads (created_by, created_at desc)
  where status = 'active';
