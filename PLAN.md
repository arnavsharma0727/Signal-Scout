# Signal Scout delivery plan

## Goal

Evolve the live Signal Scout collection MVP into an evidence-first research platform that can identify Korea-first information about a user watchlist, explain why a lead surfaced, show translated source evidence when authorized, and publish an honest forward track record. It must not fabricate data or imply that a source sample represents a whole market.

## Current baseline (2026-09-30)

- Stack: Next.js 15 App Router, TypeScript, Supabase Postgres, Vercel Hobby deployment and daily Cron.
- Production: `https://signal-scout-xi-ruby.vercel.app/`; protected ingestion endpoint; private Supabase credentials and Cron secret are configured in Vercel, not Git.
- Database: migrations 0001–0008 are applied to the production Supabase project. `metrics_daily` exists with RLS; the production recompute endpoint is protected. Fifty-two bilingual entity/instrument profiles are seeded alongside the legacy broad `MARKET-TALK` profile; none currently has eligible public evidence linked.
- Latest baseline before publisher-feed rejection: 205 documents total: 15 KR RSS, 14 US RSS, and 176 Hacker News comments; latest 24-hour view had 109 records. Inspection confirmed both RSS configurations used `news.google.com`; sample article HEAD requests stayed on Google News (HTTP 204), not publisher domains. Those rows are now hidden publicly and new collection from that aggregator is rejected.
- Important gaps: 52 active bilingual company/instrument profiles are now seeded. No Korean community or publisher-news feed is cleared; a separate MOIS official-policy context connector is being added, but it is not forum sentiment. There is no authorized translation, lead computation, or prospective track record. Source health is visible, but records/feeds are not representative coverage. GDELT currently returns 429 and is disabled; Bluesky returned 403 and is disabled. Historical HN records are stored but hidden while rights are reviewed; there is currently no cleared public discussion source.
- Preserve the existing uncommitted `apps/web/tsconfig.tsbuildinfo` change. Never read, stage, print, or commit `.env.local` or Vercel credentials.

## Milestones

## Execution log

- **M0 completed and deployed:** commit `cc54f12`; reconciled claims/branding, added privacy/contact pages and production verification. Post-deploy, all 8 public routes returned app content (200) and unauthenticated ingestion returned 401. Five genuine product/release gates remain: relevant volume, distinct domains, daily entity metrics, evidence-backed translated lead, and prospective track record.
- **M1 completed and deployed:** commit `b2c2bee`; safe transient retries, `Retry-After` handling, safe error codes, partial RSS status, source health from connector-run records, exact HN comment permalinks, RSS relative-link resolution, and no invented entity confidence. No migration/signup required. Official access constraints are in `docs/SOURCES.md`/`docs/data-sources.md`. A later audit found the configured RSS was Google News redirects rather than publisher feeds; M2 rejects that source and hides historic aggregator rows.
- **M2 foundation deployed:** commit `f659e9e`; migration 0006, alias matching/import/linking deployed. At that stage no profiles had been seeded; direct Korean publisher/community access and translation remained gated.
- **M2 profile seed (production data applied; code/docs local):** imported 52 bilingual KR/ko and US/en profiles from `profiles/core_entities.json`, verified with the profile validator, into the production database. Direct SQL confirms 52 active profiles have both market rows and none is missing a market; five relationships are recorded. This additive import preserved `MARKET-TALK` and historical source records. The seed includes company names and three ETF conversation trackers, not a retail-flow ranking. No evidence records or metrics are fabricated; without a cleared feed, entity-linked metrics remain zero.
- **M3 in progress (deployed foundation):** migration 0007 and protected daily entity/market/source-class recomputation are applied in production. Metrics include linked-document and distinct-hash counts, independent domains, effective domain sample size, earliest timestamp in the observed 30-day window, observed-day trailing median/MAD (null until 14 prior observed days), and null topic/stance pending validated classification. Evidence status remains `insufficient` or `descriptive_only`, never a lead/signal. Production currently has zero qualifying entity metrics because there are no eligible entity-linked source documents; Korea-first/divergence inference, lead lifecycle, and FDR control remain unimplemented.
- **M4 in progress (deployed foundation):** `/coverage`, database-backed lead list, evidence detail pages, searchable profile directory, and per-entity research pages are live with honest empty/unavailable states. The app still lacks user watchlists, timezone selection, and real eligible source evidence; lead pages remain empty.
- **M7 in progress (partly deployed):** migration 0008 is applied. RLS is enabled on operator tables, but the production audit found broad anon-readable policies on source documents, candidate events, leads, lead links, entity matches, metrics, topic observations, source sets, entity links, and cross-market divergence rows. All application database access is through the server-only service-role client; migration 0009 removes these unneeded direct policies while preserving active public entity profiles. HN ingestion requires separate collection and rights approval, and HN-linked content is withheld from app evidence/metrics/leads. Historical HN records remain stored while reuse/retention rights are reviewed. Retention/takedown, rate limiting, Lighthouse, and full access-control tests remain open.
- Historical production verification at `f659e9e`: 10/16 checks passed before the metrics page/schema and rights gates were deployed. At that time, `metrics_daily` was absent.
- **Schema/security deployment:** commit `80406e5` was deployed to Vercel production deployment `dpl_13zt6LMea5zNNE3HcrQuwfHtw` and aliased to `https://signal-scout-xi-ruby.vercel.app/`. Production migrations 0007 and 0008 were applied via the authenticated Supabase CLI after dry-run confirmed only those two pending files. Migration history now shows 0001–0008. Direct SQL verification confirms `metrics_daily` exists with RLS and all eight intended operator/private tables have RLS enabled. Public routes including `/coverage` return 200; unauthenticated `/api/ingest` and `/api/metrics/recompute` both return 401. `/sources` shows the HN rights gate; the briefing withholds HN content and no longer contains the stale claim that it is displayed.
- Latest production verification: **14/20 checks passed; six data/credibility gates remain**: 500 entity-linked records within 24 hours (0), eight independent domains (0), both markets and two source classes (0/0), 40 distinct entities with today's metric row (0), one evidence/counter-evidence lead (0), and a prospective track record (table absent). Zero unresolved publisher domains passes. No lead or track record is fabricated.
- Production data added after the latest code deployment: 52 active bilingual profiles (all 52 have KR and US market rows), plus five explicitly qualified entity relationships. `/companies` live route returned 200 and rendered NVIDIA and SK hynix without the prior empty state. The profile seed/importer/test changes are local and pending a GitHub commit; importing profiles did not enable any source or create evidence.
- Profile-seed verification: 58 tests passed, typecheck passed, production build passed, and `git diff --check` passed. The post-seed production verifier remains 14/20: the same six evidence/data-readiness gates remain, since profiles alone do not create eligible source evidence or computed metrics.
- **M4 entity research workflow (local implementation):** profile directory now supports query-string search across English/Korean names, tickers, aliases, and topics, and links to per-entity research pages with profile metadata, reviewed relationships, and eligible source records separated by market. HN and Google News redirect records are excluded; empty evidence explicitly means no eligible linked records, not absence of market discussion. Validation: 58 tests, typecheck, optimized Next.js build, and whitespace check pass. Deployment verification remains pending.
- **M4 entity workflow deployed:** commit `da71068` was pushed to GitHub `main` and deployed to Vercel production deployment `dpl_EMmDweEi2bXsH7h9isT5zKCg4UFE`, aliased to `https://signal-scout-xi-ruby.vercel.app/`. Authenticated production requests confirmed `/companies?q=NVDA` renders matching profiles and `/companies/NVDA` renders the entity overview, separated KR/US evidence sections, and honest empty-evidence messaging. The initial deploy attempt from the nested `apps/web` folder targeted an unrelated `web` Vercel project and failed before publishing; the repository-root-linked `signal-scout` deployment succeeded. No change was made to the unrelated project.
- **M7 public-evidence eligibility hardening (deployed):** commit `2b6de46` centralized exclusion of Hacker News and Google News redirect records from the public briefing, entity evidence, and daily metric aggregation. This closes a gap where withheld records were hidden in the UI but could still enter metrics. Deployed to Vercel production deployment `dpl_8G4J1vZarPcpWgzHgrNxWm3ioHtK` (READY; production alias unchanged). Validation passes: 60 tests, typecheck, production build, and `git diff --check`. Post-deploy verifier confirms all route/protection/source-rights checks still pass; six real-data gates remain unchanged.
- **M1/M6 MOIS source connector (deployed/configured):** official MOIS RSS page documents the press-release feed; its copyright policy permits MOIS-owned works marked KOGL Type 1 with specific attribution. The no-key connector checks each matching article page's license and stores title/link/date only, under a separate `official-policy` source class; code defaults off and deliberately does not represent investor discussion. Commit `589bdc0` deployed at `dpl_8T6VUfPsvHfRzrMaduBRKq7bbuyX`; production feature flag was then enabled and deployment `dpl_AZyzC8Eb2psJhL8eferbrgbwrBQV` is READY. Authenticated source-health page confirms flag on but status stale/no run yet. The live RSS endpoint returned successfully, but had no matching item in 72 hours (or the checked 30-day window), so no live evidence was produced. A manual ingestion request without the hidden Cron secret returned 401; it was not bypassed. Next verification is the scheduled run. Post-deploy product verifier remains 14/20 with the same six genuine data/track-record gates.
- **M7 RLS audit / policy fix (local, production dry-run passed):** direct `pg_policies` inspection confirmed broad public-read policies on the content and aggregate tables listed above. Code audit confirms app queries use `serverSupabase()` from a `server-only` module; no browser Supabase client exists. Additive migration `0009_private_server_reads.sql` drops direct anon/authenticated read policies for raw evidence, derived content/metrics, and internal source metadata; active public entity profiles remain readable. Supabase dry-run reports only migration 0009 pending. Production apply plus anon/API and app-page regression checks are next.
- **M6 source review (pushed in `4aa963b`):** official NAVER migration/terms, SBS and Kyunghyang RSS restrictions, Kakao prior-approval gate, Reddit explicit-approval gate, and the limited use of MOFA RSS as official-policy context are recorded in `docs/SOURCES.md`. No connector was enabled, no paid service was used, and no permission request was submitted.
- **M7 HN fail-closed hardening (pushed in `7bed0e0`, deployed in `80406e5`):** production environment names confirm `HACKER_NEWS_ENABLED` exists but no `HACKER_NEWS_RIGHTS_APPROVED` flag is set. Therefore collection is disabled in code despite the legacy flag. Historical HN records remain stored but are not exposed by public evidence, metrics, or leads pending source-rights/retention review.

### M0 — Audit, plan, and product integrity

1. Record this plan before implementation.
2. Remove leaked setup notes, align page names with the Signal Scout product, add explicit UTC timestamps with timezone labels, and centralize the single product disclaimer.
3. Reconcile README and deployment/source documentation with the deployed system.
4. Add the production verification script and make it report unmet release criteria honestly (never synthesize evidence to pass).
5. Run tests, typecheck, build, deployed-page checks, and secret scan; commit and push the milestone.

### M1 — Evidence data foundation and source health

1. Normalize documents to the required provenance contract: resolved publisher URL/domain, concise excerpt, source class, language/market, published/fetched UTC times, canonical URL, and content hash.
2. Replace Google News redirect storage with permitted publisher feeds or resolve to the original publisher without bypassing access controls. Remove sources that do not permit the intended collection/display.
3. Add connector run health, freshness/lag, retries with backoff, and safe dead-letter/error reporting.
4. Verify official RSS, SEC EDGAR, DART, and GDELT endpoint policies before connector work. Make connectors independently disableable and testable.
5. Require matching time windows and source classes for comparisons; keep discussion and news in separate streams.

### M2 — Entity profiles, relevance, and translation

1. Replace the single macro watch with editable database-backed entity profiles: exchange/ticker or KRX code, Korean and English names/aliases, negative aliases, topics, priority tier, and related-entity links.
2. Seed the core cross-market names and supplier/customer relationships from the master prompt; grow toward 40 only with reviewed aliases and false-positive tests.
3. Implement deterministic alias matching and a relevance threshold before any entity metric.
4. Add schema-validated topic/stance classification only when evidence and validation support it.
5. Translation must be cached, marked machine-translated, and displayed alongside originals. No paid model or translation API is enabled without an explicitly approved provider/key and cost limit; otherwise keep translation unavailable and label it clearly.

### M3 — Metrics, Korea-first leads, and lifecycle

1. Store per-entity, per-market, per-source-class daily unique-cluster counts, independent domains, topic/stance mix, first-seen UTC, effective sample size, and trailing robust baselines.
2. Implement Korea-first and narrative-divergence candidates with equal windows/classes, minimum sample sizes, lead-lag checks, and Benjamini–Hochberg correction.
3. Keep unsupported flow/filing lead types disabled until licensed/authorized inputs exist.
4. Add evidence-linked lead lifecycle, reviewer notes, explicit disconfirming evidence, score components, and versioned scoring constants.
5. Never publish a score below evidence thresholds; store null/insufficient evidence as such.

### M4 — Research workflow UI

1. Build a ranked briefing scoped to watchlists, with a clearly separated “all signals” view.
2. Add evidence-rich lead detail (original plus optional translation, counter-evidence, source links, first-seen timeline, disproof checklist).
3. Add entity pages, search/filtering, parallel source-class feeds, timezone choice, and an operator source-health page.
4. Generate Methodology from the same constants used by code. Keep neutral, minimal styling and one consistent product name.

### M5 — User workflow

1. Add Supabase Auth only after RLS and access-control review.
2. Add private watchlists, CSV import/export, read-only share links, notes, and rate-limited alerts/digests.
3. Keep public evidence read-only and never expose the service-role key to browser code.

### M6 — Community, flows, prices, and track record

1. Evaluate Reddit, Bluesky, StockTwits, Korean community sources, and Korean retail-flow data one at a time. Record licensing, attribution, rate limits, retention, and fallback in `docs/SOURCES.md` before implementation. Legal-review sources stay disabled until reviewed. Kakao/Daum Cafe Search is technically free-quota eligible (published 30,000 calls/day), but its current Developer Terms require prior Kakao approval to publish/translate/use returned data; it remains off pending written permission. Reddit requires explicit API access approval and has strict retention/deletion requirements; it also remains off.
2. Do not scrape Naver/Toss/DC Inside or bypass access controls. If no permitted Korean forum feed is available, say so plainly.
3. Add price/flow ingestion only with a display/derived-data license that fits the product and an approved no-cost/paid budget.
4. Start an append-only prospective lead log. Add backtests only where clean historical source and price data exist; publish sample sizes, confidence intervals, and null results.

### M7 — Hardening and launch gate

1. Add connector contract, entity false-positive, scoring, access-control, and end-to-end tests.
2. Add structured operational logs, public-endpoint rate limits, privacy/contact/legal pages, retention policy, and counsel questions in `docs/LEGAL.md`.
3. Run Lighthouse/accessibility and production verification; fix defects or document blocked gates before calling the product complete.
4. Commit and push each completed milestone; deploy only after the corresponding production check passes.

## Release gates and constraints

- The master prompt's 500 relevant documents, 8 publisher domains, 40 entity metrics, translated evidence lead, and historical hit-rate targets are not currently met. The verification script must fail these checks with specific reasons until real authorized coverage and computation exist.
- Current RSS/Hacker News samples do not establish a Korean-forum vs U.S.-forum comparison. They must not be combined into one divergence metric.
- No invented translations, posts, records, price data, flows, or track record.
- Never enable a paid service, add billing/payment details, accept a license, or transmit new personal contact data without the required explicit approval.
- Keep all secrets out of source, logs, build output, browser bundles, and Git history.
- At every milestone end, report: built, verified, failed, and still uncertain.
