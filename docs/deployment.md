# Deployment

Signal Scout is deployed as a Next.js app on Vercel and stores collected source evidence in Supabase Postgres. Vercel Cron calls the protected `/api/ingest` route daily. The deployed app currently collects a narrow source sample; it does not calculate cross-market topic differences.

## Local development

Next.js 16 requires Node.js 20.9 or newer. Use an active LTS release (the current Vercel production builder must be verified on deployment).

```bash
npm install
npm run dev
```

Set local-only values in the root `.env.local`, which must remain ignored by Git. Required server-side settings are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`. Source connectors are controlled by server-side flags and feed configuration such as `RSS_ENABLED`, `RSS_FEEDS_KR_JSON`, `RSS_FEEDS_US_JSON`, and `HACKER_NEWS_ENABLED`. RSS must point directly to publisher feeds; Google News redirects are rejected and historical Google News rows are hidden from the public evidence view. Review each publisher's permission before configuring it. Do not use a service-role key or cron secret in any `NEXT_PUBLIC_` variable.

### Private watchlists and Supabase Auth

The Auth UI, cookie-session refresh, callback, private watchlist CRUD, and CSV import/export are implemented, but Auth is **disabled by default**. To enable after configuring a production-capable Auth provider, provide these server-only variables in `.env.local` / Vercel:

- `SUPABASE_URL` (already used by the server)
- `SUPABASE_ANON_KEY` (the Supabase anon/publishable key; not the service-role key)
- `SUPABASE_AUTH_ENABLED=true`
- `NEXT_PUBLIC_APP_URL` set to the exact site origin, e.g. `https://signal-scout-xi-ruby.vercel.app`

In Supabase Auth URL Configuration, allow the exact callback URL `https://signal-scout-xi-ruby.vercel.app/auth/callback` and local `http://localhost:3000/auth/callback` for development. Do not enable public email signup on the built-in shared sender: it is intended for testing, currently limited to 2 messages/hour and team-authorized recipient addresses. Configure custom SMTP or an OAuth provider and test a non-team account before turning on `SUPABASE_AUTH_ENABLED`. No SMTP/provider configuration or credentials have been added by this change. The callback uses PKCE and only accepts same-site relative return paths.

Watchlist data is read/written through the authenticated server client and owner-scoped RLS. CSV imports accept active profile tickers only (maximum 200 rows / 100 KB); exports are private and non-cacheable. Lists cannot be made public; share links, notes, and alerts are not implemented.

## Production

Add the same required settings in the Vercel project's private Environment Variables UI for the intended deployment environments. Vercel Cron authenticates using the configured `CRON_SECRET`. Never put credentials in source files, build logs, client-side variables, screenshots, or GitHub. Supabase migrations are maintained in `supabase/migrations`; apply reviewed migrations to the intended project before deploying code that depends on them.

The current schedule is once daily (Vercel Hobby-compatible). Connector response codes and configuration do not by themselves establish successful or legally permitted collection; review freshness and source terms separately.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm run verify:prod
npm audit
```

`verify:prod` checks public routes, confirms ingestion rejects unauthenticated requests, and queries product data gates when server credentials are available locally. It never logs credential values. A nonzero exit is expected until minimum coverage, computed metrics, evidence-backed leads, and prospective track-record requirements are genuinely met. Do not fabricate records to make the check pass.
