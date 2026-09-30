# Database access review

The application uses the Supabase service-role client only in Next.js server code. The service-role secret must never be placed in a `NEXT_PUBLIC_*` variable or sent to a browser.

## Access model

- Public read: active companies and enabled market profiles; source documents; candidate/leads data; entity links; document/entity matches; and lead-to-source links used to display public evidence.
- Server only (RLS enabled with no client policies): company profile import-run records, document analyses/translations, connector-run logs, source-query cache, request budgets, watchlists, and watchlist membership. These remain service-role-only until authentication, ownership, and per-user policies are reviewed and implemented.
- Ingestion and metric recomputation are server endpoints requiring the configured cron secret. No browser client receives that secret.

Migration [`0008_lock_down_operator_tables_rls.sql`](../supabase/migrations/0008_lock_down_operator_tables_rls.sql) applies deny-by-default RLS to the operator/private tables and grants public `SELECT` only on lead evidence links. It does not grant `INSERT`, `UPDATE`, or `DELETE` to browser roles.

## Deployment verification still required

The local code review does not prove the production grants/policies. After migrations 0007 and 0008 are applied, verify through Supabase SQL Editor that RLS is enabled on all tables, inspect `pg_policies`, and test reads/writes using the anon key (without ever printing or exposing it). Until then, authentication and private watchlists remain disabled.
