# Deployment

Signal Scout is deployed as a Next.js app on Vercel and stores collected source evidence in Supabase Postgres. Vercel Cron calls the protected `/api/ingest` route daily. The deployed app currently collects a narrow source sample; it does not calculate cross-market topic differences.

## Local development

Next.js 16 requires Node.js 20.9 or newer. Use an active LTS release (the current Vercel production builder must be verified on deployment).

```bash
npm install
npm run dev
```

Set local-only values in the root `.env.local`, which must remain ignored by Git. Required server-side settings are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`. Source connectors are controlled by server-side flags and feed configuration such as `RSS_ENABLED`, `RSS_FEEDS_KR_JSON`, `RSS_FEEDS_US_JSON`, and `STACK_EXCHANGE_ENABLED`. Stack Exchange requires no key; its connector searches nine English- and other-language communities, only stores individual items explicitly labeled CC BY-SA 4.0, and displays attribution. It makes at most 27 bounded requests per daily ingestion run and stops on long API backoff. RSS must point directly to publisher feeds; Google News redirects are rejected and historical Google News rows are hidden from the public evidence view. Review each publisher's permission before configuring it. Do not use a service-role key or cron secret in any `NEXT_PUBLIC_` variable.

### Source takedown

Migrations `0012_source_takedown.sql` and `0013_takedown_lead_cascade.sql` add an operator-only hard-delete workflow. Before deploying this migration-dependent code, generate a distinct random `TAKEDOWN_SECRET` and configure it as a private server-side Vercel environment variable (and local `.env.local` only if testing locally). Never reuse `CRON_SECRET`, expose the value in a `NEXT_PUBLIC_` variable, or commit it. Until configured, `/api/operator/takedown` deliberately returns 503. Operators submit `POST /api/operator/takedown` with `Authorization: Bearer <TAKEDOWN_SECRET>` and JSON `{ "documentId": "<source UUID>", "reason": "rights_request|privacy_request|operator_review" }`. This endpoint is for trusted operators after verifying a request; it is not a public request intake form.

The database transaction deletes the source item, its attached analyses and entity links, and directly linked research leads; it invalidates affected derived rows and retains only an opaque identifier/reason/outcome audit plus SHA-256 content/URL fingerprints to prevent re-ingestion. The fingerprints are not reversible, but remain personal-data-adjacent identifiers and need counsel-approved retention. This is an on-demand deletion path, not an automatic source-specific expiration schedule. Test on non-production data before processing real takedown requests.

### Private watchlists and Supabase Auth

The Auth UI, cookie-session refresh, callback, private watchlist CRUD, and CSV import/export are implemented, but Auth is **disabled by default**. To enable after configuring a production-capable Auth provider, provide these server-only variables in `.env.local` / Vercel:

- `SUPABASE_URL` (already used by the server)
- `SUPABASE_ANON_KEY` (the Supabase anon/publishable key; not the service-role key)
- `SUPABASE_AUTH_ENABLED=true`
- `NEXT_PUBLIC_APP_URL` set to the exact site origin, e.g. `https://signal-scout-xi-ruby.vercel.app`

In Supabase Auth URL Configuration, allow the exact callback URL `https://signal-scout-xi-ruby.vercel.app/auth/callback` and local `http://localhost:3000/auth/callback` for development. Do not enable public email signup on the built-in shared sender: it is intended for testing, currently limited to 2 messages/hour and team-authorized recipient addresses. Configure custom SMTP or an OAuth provider and test a non-team account before turning on `SUPABASE_AUTH_ENABLED`. No SMTP/provider configuration or credentials have been added by this change. The callback uses PKCE and only accepts same-site relative return paths.

Watchlist data is read/written through the authenticated server client and owner-scoped RLS. CSV imports accept active profile tickers only (maximum 200 rows / 100 KB); exports are private and non-cacheable. Lists cannot be made public; share links, notes, and alerts are not implemented.

Watchlist mutations use a Supabase Postgres per-user hourly quota (10 create, 10 delete, 200 membership changes, 6 CSV imports, 30 CSV exports). Migration `0011_watchlist_action_limits.sql` must be applied before deploying the corresponding server actions. These quotas do not rate-limit anonymous page reads.

## Production

Add the same required settings in the Vercel project's private Environment Variables UI for the intended deployment environments. Vercel Cron authenticates using the configured `CRON_SECRET`. Never put credentials in source files, build logs, client-side variables, screenshots, or GitHub. Supabase migrations are maintained in `supabase/migrations`; apply reviewed migrations to the intended project before deploying code that depends on them.

The current production project is deployed manually from this linked checkout. A GitHub auto-deploy connection attempt failed because Vercel could not access `arnavsharma0727/Signal-Scout`; do not assume a Git push deployed the site. To enable automatic deployments, grant the Vercel GitHub App access to this repository in the Vercel/GitHub integration settings, then verify a harmless commit creates a production deployment before relying on it. Until verified, use `npx vercel deploy --prod --yes` from the repository root after pushing and inspect the deployment's `READY` status.

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
