# Atlas

**The Engine for Global Markets**

Atlas is a focused search engine for current public conversations and reporting about a market interest. Search results begin with separate language/source highlights; original links and provider details are grouped afterward. It is not a financial-data terminal, polling service, sentiment model, or investment recommendation system.

## What a search covers

- Hacker News comments: public Algolia search, recent 30-day window, with local checks that all meaningful query terms appear in the returned title/comment.
- Bluesky: optional public AppView search, recent 7-day indexed-post window. It is opt-in; use separate researcher-entered phrases for language variants, and treat missing language metadata as unknown.
- Global Voices: public multilingual reporting search, recent 30-day window. Atlas locally requires query terms to match the returned headline, and omits body-only matches; an edition language does not identify the location or views of readers.
- Stack Exchange: selected specialist communities, title matches from the recent 30 days. This is expert Q&A, not a broad forum sample.
- Lemmy: optional, researcher-selected public instances, recent 7-day window. Federation can duplicate posts; instances and language are not country proxies.

Provider coverage and search behavior differ. An empty result does not establish that a topic is absent. Counts are returned records, not unique people, market attention, or prevalence. Atlas does not silently translate, infer synonyms, or infer contributor geography; optional alternate phrases are researcher-supplied, searched separately, and shown with their query. Overview highlights are source excerpts or headlines, not a generated consensus; reference IDs map to the citation list below them.

Atlas does not currently establish a U.S. sample, representative country-level opinions, validated sentiment, source independence, financial materiality, or an investment thesis. Use it to discover questions and inspect original sources—not as a substitute for filings, financial statements, valuation work, or independent verification.

## Run locally

```bash
npm install
npm run dev
```

Use a private `.env.local` for local server configuration. Never commit it. Production secrets belong in Vercel environment settings. See [deployment](docs/deployment.md), [sources](docs/data-sources.md), and [methodology](/methodology).

## Architecture

The search UI calls bounded public-source adapters. Optional private operational endpoints remain protected server-side. Search queries and live result sets are transient and are not stored by the search UI.

## Development and verification

```bash
npm test
npm run typecheck
npm run build
npm run verify:prod
```

The production verification script checks deployed routes and data/release conditions without printing credentials. It may report unmet gates; it does not invent data to pass them.

## Scope and safety

Public online activity is not necessarily representative or financially material. Do not scrape sites, bypass access controls, or display content beyond applicable source terms. Consult the [source register](https://signal-scout-xi-ruby.vercel.app/sources), [privacy notice](https://signal-scout-xi-ruby.vercel.app/privacy), and [methodology](https://signal-scout-xi-ruby.vercel.app/methodology) before interpreting results.
