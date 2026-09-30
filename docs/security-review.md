# Database access review

The application uses the Supabase service-role client only in Next.js server code. The service-role secret must never be placed in a `NEXT_PUBLIC_*` variable or sent to a browser.

## Access model

- Direct PostgREST public read: active companies and enabled market profiles only. Public application pages retrieve evidence through server-rendered code that applies eligibility/source-rights checks before display.
- Server only (RLS enabled with no anon/public policies): source documents, candidate/leads data, entity links/matches, metrics, divergence rows, import-run records, analyses/translations, connector-run logs, query cache, and request budgets. The server-only service-role client bypasses RLS and must continue applying the public evidence rules.
- User-owned: watchlists and memberships are accessible only to their authenticated owner through database RLS. Lists must remain private; public sharing is explicitly not enabled.
- Ingestion and metric recomputation are server endpoints requiring the configured cron secret. No browser client receives that secret.

Migrations 0008–0009 lock down operator and evidence tables. Migration [`0010_user_owned_watchlists.sql`](../supabase/migrations/0010_user_owned_watchlists.sql) adds required Auth ownership and owner-only policies to private watchlists; it prevents authenticated users from creating or changing a list to public. A membership can be added only to an owned private list and only for an active company. Deleting a list cascades to its memberships.

## Authentication deployment gate

Migrations 0001–0010 are applied in production. Migration 0010's precondition check found zero users, lists, or memberships, and the post-apply migration ledger reports 0010. The app now includes cookie-backed SSR Auth, server-validated user checks, callback/login/logout, owner-scoped watchlists, and private CSV import/export. It remains disabled until `SUPABASE_AUTH_ENABLED=true`, `SUPABASE_ANON_KEY`, the production app origin, Supabase callback allowlisting, and a production-capable email/OAuth provider are configured. The Supabase shared email sender is limited to 2 emails/hour and project-team recipients; it is not suitable for general public signup. Once a real provider is available, test isolation with two accounts before opening signup. Never place a service-role credential in a browser bundle.

Migration 0011 adds a per-user one-hour limiter for watchlist create/delete, membership writes, CSV imports, and CSV exports. Limits are 10 creates, 10 deletes, 200 member changes, 6 imports, and 30 exports per hour. The counter table has RLS, no policies, and no direct anon/authenticated table privileges; only authenticated users may invoke the fixed-action RPC, which binds counters to `auth.uid()`. Mutation actions fail closed if the limiter cannot be checked; CSV export returns 503 on limiter errors and 429 with `Retry-After` when quota is exhausted. This does not rate-limit anonymous page reads; that remains open.

## Dependency review

On 2026-09-30, `npm audit` reported vulnerable `csv-parse` 5.x, Next.js's nested PostCSS, and development-only Vitest/Vite/esbuild. Upgraded to `csv-parse` 7.0.3, Next.js 16.3.8, and Vitest 4.1.11. The PostCSS issues were in Next 15's pinned build-time dependency; Next 16.3.8 resolves to PostCSS 8.5.23. A regression test covers hostile duplicate `__proto__` CSV headers. Local full audit and production-only audit both report zero vulnerabilities. Re-run `npm audit` as part of dependency updates; audit cleanliness is point-in-time, not a guarantee.
