# Signal Scout

**Compare the conversation. Follow the evidence.**

Signal Scout is an early-stage international research workspace that turns public discussion into linked research context. Its live discussion connector covers Stack Exchange Economics, Money, AI, Data Science, Security, and Spanish-, Portuguese-, Japanese-, and Russian-language Stack Overflow. Only individual items explicitly marked CC BY-SA 4.0 are retained, with author and license attribution; titles link to the original question. This is a narrow expert-Q&A sample—not representative consumer, country, or investor opinion.

## Current production scope

- International Stack Exchange discussion evidence, with exact source links, author/site attribution, license, original language, tags, and timestamps for human review. The connector searches 11 communities with at most 33 bounded queries/day, including Politics and Law Q&A title searches for tariffs, sanctions, and trade. Its first multilingual production run stored 24 items in the rolling 24-hour view without connector errors; the homepage displayed English, Spanish, and Russian items. This is one expert-Q&A operator, not independent forum coverage or representative public opinion.
- The lead-review page groups exact tags from licensed questions in its 72-hour sample into descriptive, linked discussion observations. Singletons remain visible; this is not a trend estimate, semantic translation, or qualified thesis lead.
- The Explore page lets a person search one selected international Stack Exchange community live for a topic. It shows only explicitly CC BY-SA 4.0 items with author/community/source/license attribution; the query goes directly from the browser to Stack Exchange and results are not persisted by Signal Scout.
- Explore also offers an on-demand Mastodon hashtag view of up to 20 public posts from mastodon.social's incomplete federated timeline. Posts are shown transiently with author and original links, content warnings are respected, accounts marked automated are identified, and nothing is stored. This is not a complete fediverse or representative global conversation sample; no blanket content license is implied.
- Daily scheduled collection on Vercel; server-side Supabase storage.
- No evidence-qualified international thesis lead, validated topic classifier, translation, production watchlist signup, alerts, or forward track record.
- No Korean discussion source or direct publisher news feed is currently active. Google News redirect feeds are rejected; GDELT is enabled for one global daily query but still failing with HTTP 429; Bluesky is disabled after access failures.

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
