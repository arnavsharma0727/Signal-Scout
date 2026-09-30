# Signal Scout

**Compare the conversation. Follow the evidence.**

Signal Scout is an early-stage evidence-collection app. Its visible production evidence is currently a narrow U.S.-leaning sample of public Hacker News comments; direct Korean publisher feeds are not configured. Legacy Google News redirect records are excluded from the public UI. It does not currently compare topic frequency, classify sentiment or stance, translate Korean content, or produce investment conclusions.

## Current production scope

- Narrow U.S.-leaning sample of public Hacker News comments. No direct Korean publisher/news/forum feed is currently active.
- Original source links and available source timestamps for human review.
- Daily scheduled collection on Vercel; server-side Supabase storage.
- No live divergence score, entity relevance ranking, translation, watchlists, alerts, or validated track record.
- Google News redirect feeds are rejected because they do not identify publisher domains. GDELT is disabled after rate limiting; Bluesky is disabled after access failures. There is no Korean forum connector at present.

News articles and discussion comments are distinct source classes. The app must not pool them as comparable observations. Raw record counts are not measures of attention, belief, awareness, or market behavior.

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
