# Database access review

The application uses the Supabase service-role client only in Next.js server code. The service-role secret must never be placed in a `NEXT_PUBLIC_*` variable or sent to a browser.

## Access model

- Direct PostgREST public read: active companies and enabled market profiles only. Public application pages retrieve evidence through server-rendered code that applies eligibility/source-rights checks before display.
- Server only (RLS enabled with no anon/public policies): source documents, candidate/leads data, entity links/matches, metrics, divergence rows, import-run records, analyses/translations, connector-run logs, query cache, and request budgets. The server-only service-role client bypasses RLS and must continue applying the public evidence rules.
- User-owned: watchlists and memberships are accessible only to their authenticated owner through database RLS. Lists must remain private; public sharing is explicitly not enabled.
- Ingestion and metric recomputation are server endpoints requiring the configured cron secret. No browser client receives that secret.

Migrations 0008–0009 lock down operator and evidence tables. Migration [`0010_user_owned_watchlists.sql`](../supabase/migrations/0010_user_owned_watchlists.sql) adds required Auth ownership and owner-only policies to private watchlists; it prevents authenticated users from creating or changing a list to public. A membership can be added only to an owned private list and only for an active company. Deleting a list cascades to its memberships.

## Deployment verification still required

Migrations 0001–0010 are applied in production. Migration 0010's precondition check found zero users, lists, or memberships, and the post-apply migration ledger reports 0010. The application does not yet expose Auth or watchlists: configure a production-capable email sender or OAuth provider and allowlisted redirects, then add server-validated sessions and test that two users cannot see or mutate one another's lists before signup is enabled. The Supabase shared email sender is rate-limited and restricted to project-team recipients; it is not suitable for general public signup. Never place a service-role credential in a browser bundle.
