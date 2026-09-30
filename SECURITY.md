# Security

Report vulnerabilities privately to the contact configured in `NEXT_PUBLIC_CONTACT_EMAIL`. Never expose Supabase service-role keys or connector credentials to browser code. Internal job endpoints must require `CRON_SECRET`.

Raw source documents, entity matches, candidate events, leads, lead-document links, daily metrics, and internal source-set/relationship records must not be directly readable by the Supabase `anon` or `authenticated` roles. The public application reads through the server-only service-role client and applies the source-rights and evidence-qualification filters before rendering. Only active company profiles and enabled market profiles have direct public-read policies. Keep this invariant when adding browser-side Supabase/Auth clients.
