import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isOAuthProviderEnabled } from './oauth-provider-status';

export function authConfigured() {
  return process.env.SUPABASE_AUTH_ENABLED === 'true'
    && Boolean(process.env.SUPABASE_URL)
    && Boolean(process.env.SUPABASE_ANON_KEY);
}

/** Fail closed: a configured Supabase project is not enough if its OAuth provider is disabled. */
export async function githubOAuthEnabled() {
  return isOAuthProviderEnabled({
    configured: authConfigured(),
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    provider: 'github',
  });
}

export async function authServerClient() {
  if (!authConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (updates) => {
          try {
            for (const { name, value, options } of updates) cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot write cookies; middleware refreshes them.
          }
        },
      },
    },
  );
}
