# Cross-Market Product Audit

## What already worked

- Next.js App Router, TypeScript, Tailwind, static public pages, blank profile templates, Supabase baseline schema/RLS, validation utilities, and neutral tests were present.
- The public surface had an honest no-company/no-source state and did not contain seeded company or market content.

## Refocused in this phase

- Product language now centers on **Cross-Market Narrative Topic Divergence** and the tagline “Find the discrepancy. Investigate the story.”
- Added transparent weighted topic share, smoothing, narrative topic gap, optional log-odds, evidence thresholds, recency decay, source concentration, and Cross-Market Research Priority calculations.
- Added non-destructive `market_source_sets`, `topic_observations`, and `cross_market_divergences` tables with read-only public RLS policies.
- Added a divergence methodology test suite using only neutral labels.

## Remaining implementation

- Connector ingestion must populate these tables from real user-supplied profiles and authorized sources.
- The radar and divergence detail pages currently remain honest empty states until published divergence records exist.
- Authentication-protected imports, scheduled Edge Functions, and source-set configuration are next.
