# Signal Scout

**Compare the conversation. Follow the evidence.**

Signal Scout is an early-stage evidence-collection app for inspecting a limited sample of Korean-language and U.S. public news and discussion. It does not currently compare topic frequency, classify sentiment or stance, translate Korean content, or produce investment conclusions. The samples are incomplete and do not represent either country's population or investors.

## Current production scope

- Korean and U.S. RSS/Atom items, plus a narrow U.S.-leaning sample of public Hacker News comments.
- Original source links and available source timestamps for human review.
- Daily scheduled collection on Vercel; server-side Supabase storage.
- No live divergence score, entity relevance ranking, translation, watchlists, alerts, or validated track record.
- GDELT is disabled after rate limiting; Bluesky is disabled after access failures. There is no Korean forum connector at present.

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
