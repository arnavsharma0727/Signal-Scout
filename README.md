# Signal Scout

**Compare the conversation. Follow the evidence.**

Signal Scout is an early-stage international research workspace that turns public discussion into linked research context. Its current live discussion source is Stack Exchange English Q&A across Economics, Money, AI, Data Science, and Security. Only individual items explicitly marked CC BY-SA 4.0 are retained, with author and license attribution; titles link to the original question. This is a narrow expert-Q&A sample—not representative consumer, country, or investor opinion.

## Current production scope

- International Stack Exchange discussion evidence, with exact source links, author/site attribution, license, and timestamps for human review. Two production runs have stored eight licensed questions in the last 24 hours across four communities; relevance is limited and some matches are tangential.
- Daily scheduled collection on Vercel; server-side Supabase storage.
- No live international thesis/lead computation, validated entity relevance or topic classifier, translation, production watchlist signup, alerts, or forward track record.
- No Korean discussion source or direct publisher news feed is currently active. Google News redirect feeds are rejected; GDELT is disabled after rate limiting; Bluesky is disabled after access failures.

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
