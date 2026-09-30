-- Public site reads are served by the server-only service-role client, which
-- applies source-policy and evidence qualification checks before rendering.
-- Do not expose raw evidence, scores, or draft leads directly through PostgREST.
-- The anon/authenticated roles retain access only to explicitly public profiles.
drop policy if exists "public read documents" on source_documents;
drop policy if exists "public read candidates" on candidate_events;
drop policy if exists "public read leads" on research_leads;
drop policy if exists "public read lead document links" on research_lead_documents;
drop policy if exists "public read document entity matches" on document_entities;
drop policy if exists "public read daily evidence metrics" on metrics_daily;
drop policy if exists "public read topic observations" on topic_observations;
drop policy if exists "public read cross market divergences" on cross_market_divergences;
drop policy if exists "public read enabled source sets" on market_source_sets;
drop policy if exists "public read entity links" on entity_links;
