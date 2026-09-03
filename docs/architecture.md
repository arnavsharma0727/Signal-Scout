# Architecture

Next.js App Router serves the public, read-only research interface. Supabase Postgres stores profiles, provenance, candidates, leads, connector runs, caches, and budgets. Supabase Edge Functions perform server-side ingestion and evaluation. Protected local CLI scripts import profiles and test mappings. Service-role credentials never reach the browser.

Broad discovery is lightweight and budgeted. Active investigation is deeper and only runs for recent candidates above a configurable threshold or an explicit user selection. All connectors implement typed requests, timeouts, backoff, caching, cursors, attribution, and graceful unavailable states.
