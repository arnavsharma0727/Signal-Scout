# Database access review

The application uses the Supabase service-role client only in Next.js server code. The service-role secret must never be placed in a `NEXT_PUBLIC_*` variable or sent to a browser.

## Access model

- Direct PostgREST public read: active companies and enabled market profiles only. Public application pages retrieve evidence through server-rendered code that applies eligibility/source-rights checks before display.
- Server only (RLS enabled with no anon/public policies): source documents, candidate/leads data, entity links/matches, metrics, divergence rows, import-run records, analyses/translations, connector-run logs, query cache, and request budgets. The server-only service-role client bypasses RLS and must continue applying the public evidence rules.
- User-owned: watchlists and memberships are accessible only to their authenticated owner through database RLS. Lists must remain private; public sharing is explicitly not enabled.
- Ingestion and metric recomputation are server endpoints requiring the configured cron secret. No browser client receives that secret.

Migrations 0008–0009 lock down operator and evidence tables. Migration [`0010_user_owned_watchlists.sql`](../supabase/migrations/0010_user_owned_watchlists.sql) adds required Auth ownership and owner-only policies to private watchlists; it prevents authenticated users from creating or changing a list to public. A membership can be added only to an owned private list and only for an active company. Deleting a list cascades to its memberships.

## Authentication status

As verified by the production audit on 2026-10-08, GitHub OAuth sign-in is enabled and passes the sign-in configuration check. Do not follow older setup instructions below that describe production Auth as disabled. The production check confirms provider availability and the rendered sign-in action; it is not a substitute for a two-account authorization test. Never place a service-role credential in a browser bundle.

Migration 0011 adds a per-user one-hour limiter for watchlist create/delete, membership writes, CSV imports, and CSV exports. Limits are 10 creates, 10 deletes, 200 member changes, 6 imports, and 30 exports per hour. The counter table has RLS, no policies, and no direct anon/authenticated table privileges; only authenticated users may invoke the fixed-action RPC, which binds counters to `auth.uid()`. Mutation actions fail closed if the limiter cannot be checked; CSV export returns 503 on limiter errors and 429 with `Retry-After` when quota is exhausted. Migration 0016 adds a separate shared anonymous GDELT bridge limit: 10 requests/client/minute, 30 global/minute; client identifiers are HMACed using the server-only service-role key and expire within two minutes. These limits do not rate-limit anonymous page reads or visitor-direct browser searches against source providers.

## Dependency review

On 2026-10-08, production dependencies were updated (`sharp` 0.35.5, `source-map-js` 1.2.2), then Tailwind CSS 4.3.3 and `@tailwindcss/postcss` replaced the vulnerable Tailwind 3/PostCSS plugin chain. The theme tokens were moved to CSS-first `@theme` declarations while preserving the existing monochrome visual styles. `npm audit` reports zero vulnerabilities. Local production build, typecheck, and 263 unit tests passed after the migration; the first-screen layout was checked in a browser. Recheck all routes after future styling or framework changes.
