# Deployment

Signal Scout is deployed as a Next.js app on Vercel and stores collected source evidence in Supabase Postgres. Vercel Cron calls the protected `/api/ingest` route daily. The deployed app currently collects a narrow source sample; it does not calculate cross-market topic differences.

## Local development

```bash
npm install
npm run dev
```

Set local-only values in the root `.env.local`, which must remain ignored by Git. Required server-side settings are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`. Source connectors are controlled by server-side flags and feed configuration such as `RSS_ENABLED`, `RSS_FEEDS_KR_JSON`, `RSS_FEEDS_US_JSON`, and `HACKER_NEWS_ENABLED`. Do not use a service-role key or cron secret in any `NEXT_PUBLIC_` variable.

## Production

Add the same required settings in the Vercel project's private Environment Variables UI for the intended deployment environments. Vercel Cron authenticates using the configured `CRON_SECRET`. Never put credentials in source files, build logs, client-side variables, screenshots, or GitHub. Supabase migrations are maintained in `supabase/migrations`; apply reviewed migrations to the intended project before deploying code that depends on them.

The current schedule is once daily (Vercel Hobby-compatible). Connector response codes and configuration do not by themselves establish successful or legally permitted collection; review freshness and source terms separately.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm run verify:prod
```

`verify:prod` checks public routes, confirms ingestion rejects unauthenticated requests, and queries product data gates when server credentials are available locally. It never logs credential values. A nonzero exit is expected until minimum coverage, computed metrics, evidence-backed leads, and prospective track-record requirements are genuinely met. Do not fabricate records to make the check pass.
