# Signal Scout delivery plan

## Goal

Evolve the live Signal Scout collection MVP into an evidence-first research platform that can identify Korea-first information about a user watchlist, explain why a lead surfaced, show translated source evidence when authorized, and publish an honest forward track record. It must not fabricate data or imply that a source sample represents a whole market.

## Current baseline (2026-09-30)

- Stack: Next.js 15 App Router, TypeScript, Supabase Postgres, Vercel Hobby deployment and daily Cron.
- Production: `https://signal-scout-xi-ruby.vercel.app/`; protected ingestion endpoint; private Supabase credentials and Cron secret are configured in Vercel, not Git.
- Database: migrations 0001–0005 applied. A broad `MARKET-TALK` profile is configured for KR and US.
- Latest verified ingestion: 205 documents total: 15 KR RSS, 14 US RSS, and 176 Hacker News comments. The UI intentionally caps recent evidence at 60 items per market and separates RSS from comments.
- Important gaps: no actual divergence/lead computation, no entity watchlist in the product, no Korean community source, no translation, no source-health UI, and no backtest. GDELT currently returns 429 and is disabled; Bluesky returned 403 and is disabled. Hacker News is only a U.S.-side discussion sample.
- Preserve the existing uncommitted `apps/web/tsconfig.tsbuildinfo` change. Never read, stage, print, or commit `.env.local` or Vercel credentials.

## Milestones

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

1. Evaluate Reddit, Bluesky, StockTwits, Korean community sources, and Korean retail-flow data one at a time. Record licensing, attribution, rate limits, retention, and fallback in `docs/SOURCES.md` before implementation. Legal-review sources stay disabled until reviewed.
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
