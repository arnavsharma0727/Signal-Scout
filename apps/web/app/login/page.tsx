import Link from 'next/link';
import { requestSignInLink } from './actions';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  const enabled = authConfigured();
  const db = enabled ? await authServerClient() : null;
  const { data: { user } } = db ? await db.auth.getUser() : { data: { user: null } };
  return <main className="shell min-h-[75vh] py-16">
    <header className="mb-12 flex items-center justify-between border-b border-line pb-5">
      <Link href="/" className="font-extrabold">SIGNAL SCOUT</Link>
      <Link href="/" className="text-sm text-muted">← Back</Link>
    </header>
    <section className="panel max-w-xl p-7">
      <div className="eyebrow">Private workspace</div>
      <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
      <p className="mt-3 leading-6 text-muted">Use a one-time email link to manage your private watchlists.</p>
      {user ? <p className="mt-6 text-sm">Signed in as <span className="font-semibold">{user.email}</span>. <Link className="underline" href="/watchlists">Open watchlists</Link></p>
        : !enabled ? <div className="mt-6 border-t border-line pt-5 text-sm leading-6 text-muted"><p className="font-semibold text-ink">Sign-in is not enabled yet.</p><p className="mt-2">The owner-only database controls are ready. An administrator must configure a production email sender or OAuth provider, set the Supabase redirect allowlist, and then enable Auth for this deployment.</p></div>
        : params.sent ? <p role="status" className="mt-6 border-t border-line pt-5 text-sm leading-6">If the address is eligible, Supabase has sent a sign-in link. Check your inbox and spam folder.</p>
        : <form action={requestSignInLink} className="mt-6 space-y-4 border-t border-line pt-5">
          <label className="block text-sm font-medium" htmlFor="email">Email address</label>
          <input className="w-full rounded border border-line px-3 py-2" id="email" name="email" type="email" autoComplete="email" required maxLength={254}/>
          <button className="btn btn-primary" type="submit">Email me a sign-in link</button>
          <p className="text-xs leading-5 text-muted">Signing in may create an account. Never forward or share your one-time link.</p>
        </form>}
      {params.error && <p role="alert" className="mt-5 text-sm text-muted">{params.error === 'disabled' ? 'Sign-in is not configured for this deployment.' : params.error === 'email' ? 'Enter a valid email address.' : 'The sign-in link could not be requested. Check the address and try again later.'}</p>}
    </section>
  </main>;
}
