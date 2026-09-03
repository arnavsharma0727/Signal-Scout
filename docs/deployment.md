# Deployment

Run `npm install && npm run build` locally. Configure public Supabase URL/anon key in the web environment; keep service-role keys, connector credentials, `SEC_USER_AGENT`, and `CRON_INTERNAL_SECRET` in Supabase/Vercel/GitHub Actions secret stores as appropriate. Apply migrations with Supabase CLI. Vercel serves the Next.js app; Supabase Cron invokes protected Edge Functions. Keep all schedules disabled until real profiles, authorized sources, and budgets are configured.
