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
