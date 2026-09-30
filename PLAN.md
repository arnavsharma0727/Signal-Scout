# Signal Scout delivery plan

## Goal

Evolve the live Signal Scout collection MVP into an evidence-first research platform that can identify Korea-first information about a user watchlist, explain why a lead surfaced, show translated source evidence when authorized, and publish an honest forward track record. It must not fabricate data or imply that a source sample represents a whole market.

## Current baseline (2026-09-30)

- Stack: Next.js 15 App Router, TypeScript, Supabase Postgres, Vercel Hobby deployment and daily Cron.
- Production: `https://signal-scout-xi-ruby.vercel.app/`; protected ingestion endpoint; private Supabase credentials and Cron secret are configured in Vercel, not Git.
- Database: migrations 0001–0006 applied; migrations 0007–0008 are local only and the production `metrics_daily` table check returns HTTP 404. A broad `MARKET-TALK` profile is configured for KR and US.
- Latest baseline before publisher-feed rejection: 205 documents total: 15 KR RSS, 14 US RSS, and 176 Hacker News comments; latest 24-hour view had 109 records. Inspection confirmed both RSS configurations used `news.google.com`; sample article HEAD requests stayed on Google News (HTTP 204), not publisher domains. Those rows are now hidden publicly and new collection from that aggregator is rejected.
- Important gaps: no real entity profiles are seeded; no qualifying Korean community/news feed; no authorized translation; no lead computation or prospective track record. Source health is visible, but records/feeds are not representative coverage. GDELT currently returns 429 and is disabled; Bluesky returned 403 and is disabled. Hacker News is only a U.S.-side discussion sample.
- Preserve the existing uncommitted `apps/web/tsconfig.tsbuildinfo` change. Never read, stage, print, or commit `.env.local` or Vercel credentials.

## Milestones

## Execution log

- **M0 completed and deployed:** commit `cc54f12`; reconciled claims/branding, added privacy/contact pages and production verification. Post-deploy, all 8 public routes returned app content (200) and unauthenticated ingestion returned 401. Five genuine product/release gates remain: relevant volume, distinct domains, daily entity metrics, evidence-backed translated lead, and prospective track record.
- **M1 completed and deployed:** commit `b2c2bee`; safe transient retries, `Retry-After` handling, safe error codes, partial RSS status, source health from connector-run records, exact HN comment permalinks, RSS relative-link resolution, and no invented entity confidence. No migration/signup required. Official access constraints are in `docs/SOURCES.md`/`docs/data-sources.md`. A later audit found the configured RSS was Google News redirects rather than publisher feeds; M2 rejects that source and hides historic aggregator rows.
- **M2 completed and deployed:** commit `f659e9e`; migration 0006 applied, alias matching/import/linking deployed. No profiles have been seeded, no direct Korean publisher/community feed is approved, and translation remains gated.
- **M3 in progress (local only):** add-only migration 0007 and protected daily entity/market/source-class coverage recomputation are implemented. Metrics include linked-document and distinct-hash counts, independent domains, effective domain sample size, earliest timestamp within the observed 30-day window, available-day trailing median/MAD (null until 14 prior observed days), and null topic/stance pending validated classification. Evidence status is `insufficient` or `descriptive_only`, never a lead/signal. Ingestion invokes recomputation after collection. Do not deploy until migration 0007 is applied and verified.
- **M4 in progress (local only):** added a `/coverage` evidence page with empty/unavailable states and explicit metric definitions; added it to primary navigation and production route checks. Replaced the lead-list and detail placeholders with database-backed views that require verified evidence, alternative explanations, and linked source records, then separate linked counter-evidence and validation steps. Local build succeeds; production UI cannot be verified until schema migration 0007 is applied. Set Next.js tracing root explicitly to the repository root; clean build no longer emits the multiple-lockfile workspace warning.
- **M7 in progress (local only):** added counsel/launch questions, documented indefinite-until-operator-deletes retention as a public-launch blocker, and added deny-by-default RLS for operator/private tables in migration 0008. A current-term review surfaced unresolved HN third-party display rights, alongside Kakao prior-approval and Reddit explicit-access-approval gates. No contact or permission request was submitted. Production policy verification is outstanding.
- Latest production verification at `f659e9e`: 10/16 checks passed. Pages and ingestion protection pass; remaining data gates are relevant 24h volume (0), independent domains (0), multi-market/source classes (0/0), daily entity metrics (table absent), evidence/counter-evidence leads (0), and prospective track record (table absent). Publisher-domain completeness passes because invalid aggregator data is filtered from display while historic rows are retained.
- M3 verification was rerun against production: all eight public routes returned 200 and unauthenticated ingestion returned 401. The six data gates remain unmet; a direct service-role PostgREST schema check returned HTTP 404 for `metrics_daily`. The verifier now counts distinct entity IDs, not metric rows, toward the 40-entity gate. Nothing from M3 has been deployed or pushed.
- **Latest local progress pushed to GitHub:** commit `2bfe1e4` adds local-only M3 daily metric schema/recomputation and M4 coverage/evidence-led views, plus M7 RLS/legal review documentation. Tests (50), typecheck, production build, and staged diff checks pass. This is not a Vercel deployment; GitHub integration is disconnected. Post-push production verification: 10/17 checks passed; `/coverage` is still 404, `metrics_daily` is absent, and the six evidence/data gates plus the new route gate are unmet. Production database and deployment remain unchanged.
- **M6 source review (local, not yet pushed):** current NAVER API migration and terms were rechecked against official documentation. Only legacy applications completed before 2026-07-31 are scheduled to retain Developer Center access through 2027-06-30; new Search API applications go through NAVER API Hub, which currently advertises a basic free policy with metered paid expansion. The current terms restrict durable result storage, third-party provision, and AI use, so NAVER is not suitable for Signal Scout's present data flow without written approval or a compliant redesign. Official SBS and Kyunghyang RSS are also not cleared for this shared product absent publisher permission. MOFA RSS is recorded only as a possible official-policy context feed—not forum or investor discourse. No connector was enabled and no paid service or permission request was initiated.

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
