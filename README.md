# Signal Scout

**Follow public conversation to an evidence-linked research question.**

Signal Scout is an international conversation-to-research workspace, not a stock analyzer. It separates public discussion from reporting and official context, preserves links and source limitations, and lets a researcher build a private, citation-first thesis brief. It does not issue buy/sell recommendations or claim to represent a country's beliefs.

## Current production scope

- Scheduled Stack Exchange evidence keeps only individual items explicitly marked CC BY-SA 4.0, with attribution, original-language labels, tags, and source links. It covers 11 communities and is one expert-Q&A operator—not a general forum or representative public-opinion sample.
- The local lead-dossier workflow requires recent citations, original-source review attestations, source-specific notes, multiple reviewed operators, discussion plus reporting/analysis, supporting and contradicting evidence, alternatives, and a disconfirmation test. It exports only on the researcher's device; no active or public production lead records exist.
- The research desk centers a single topic-to-brief workflow. Visitor-triggered searches include Bluesky public posts (citation metadata only), selected Stack Exchange communities, four fixed Lemmy instance views, four Mastodon server views, ten Wikimedia talk-page editions, and optional GDELT through a first-party no-store bridge. Queries and transient results are not stored by Signal Scout; exact windows, source classes, provider limitations, and links remain visible. Lemmy federation may duplicate posts, Mastodon server views are not country proxies, and Wikimedia talk pages are editorial collaboration rather than general conversation.
- Scheduled attributed reporting and expert-analysis connectors are configured for up to twelve Global Voices editions and six English-language The Conversation editions; each publisher/network is one operator. The European Commission feed is shown separately as official context. Actual run health, edition results, and unavailable sources appear on the [production Sources page](https://signal-scout-xi-ruby.vercel.app/sources).
- A browser-local research brief lets the researcher explicitly select source citations and write a working thesis, alternatives, and a disconfirmation test. It autosaves in that browser only; no automatic conclusion is generated, and account syncing remains unavailable until GitHub OAuth is configured.
- Daily scheduled collection on Vercel; server-side Supabase storage.
- No validated topic classifier, population-level trend detector, automated evidence-qualified thesis leads, production alerts, or forward track record. A local research brief helps a researcher assess selected citations; it is not a published lead and does not infer a thesis. The current production corpus contains no general Korean discussion feed. Generic RSS ingestion is off until feed-specific reuse conditions are reviewed; optional GDELT may be rate-limited.

Expert Q&A, general social discussion, regulatory filings, and news are distinct source classes. The app must not pool them as comparable observations. Raw record counts are not measures of attention, belief, awareness, or market behavior.

## Run locally

```bash
npm install
npm run dev
```

Use a private `.env.local` for local server configuration. Never commit it. Production secrets belong in Vercel environment settings. See [deployment](docs/deployment.md), [sources](docs/data-sources.md), and [methodology](/methodology).

## Architecture

Next.js serves the web app and protected ingestion endpoint. Vercel Cron calls that endpoint; authorized public-source adapters store evidence in Supabase. The Supabase service-role key is server-only and must never be included in browser bundles.

## Development and verification

```bash
npm test
npm run typecheck
npm run build
npm run verify:prod
```

The production verification script checks routes and real database coverage without printing credentials. It intentionally reports unmet product/release gates; it does not invent data to pass them.

## Scope and safety

This is a research prototype, not a stock screener, sentiment dashboard, alpha detector, price predictor, or buy/sell/hold tool. Public online activity is not necessarily representative or financially material. Do not scrape sites, bypass access controls, or display content beyond applicable source terms.
