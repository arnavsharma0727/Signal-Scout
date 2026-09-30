-- Removing a lead because one of its evidence sources was taken down must
-- also remove its remaining evidence links, not fail on the default RESTRICT.
alter table research_lead_documents
  drop constraint if exists research_lead_documents_research_lead_id_fkey;
alter table research_lead_documents
  add constraint research_lead_documents_research_lead_id_fkey
  foreign key (research_lead_id) references research_leads(id) on delete cascade;
