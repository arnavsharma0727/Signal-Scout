'use server';

import { redirect } from 'next/navigation';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';

export async function requestGitHubSignIn(formData: FormData) {
  if (!authConfigured()) redirect('/login?error=disabled');
  const supabase = await authServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!supabase || !appUrl) redirect('/login?error=disabled');
  const requestedNext = String(formData.get('next') ?? '');
  const next = requestedNext === '/briefs' ? '/briefs' : '/watchlists';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'read:user user:email',
      redirectTo: `${appUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}
