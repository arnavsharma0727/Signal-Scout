'use server';

import { redirect } from 'next/navigation';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';

export async function requestSignInLink(formData: FormData) {
  if (!authConfigured()) redirect('/login?error=disabled');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/login?error=email');
  const supabase = await authServerClient();
  if (!supabase) redirect('/login?error=disabled');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) redirect('/login?error=disabled');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl.replace(/\/$/, '')}/auth/callback?next=/watchlists` },
  });
  if (error) redirect('/login?error=send');
  redirect('/login?sent=1');
}
