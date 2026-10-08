import Link from 'next/link';
import { requestGitHubSignIn } from './actions';
import { authConfigured, authServerClient, githubOAuthEnabled } from '../../lib/supabase-auth-server';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const enabled = await githubOAuthEnabled();
  const db = enabled ? await authServerClient() : null;
  const { data: { user } } = db ? await db.auth.getUser() : { data: { user: null } };
  return <main className="shell min-h-[75vh] py-16">
    <header className="mb-12 flex items-center justify-between border-b border-line pb-5">
      <Link href="/" className="font-extrabold">ATLAS</Link>
      <Link href="/" className="text-sm text-muted">← Back</Link>
    </header>
    <section className="panel max-w-xl p-7">
      <div className="eyebrow">Private workspace</div>
      <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
      <p className="mt-3 leading-6 text-muted">Use your GitHub account to access private research briefs. Atlas requests basic profile and email identity only; it does not request repository access.</p>
      {user ? <p className="mt-6 text-sm">Signed in as <span className="font-semibold">{user.email}</span>. <Link className="underline" href="/briefs">Open saved briefs</Link></p>
        : !enabled ? <div className="mt-6 border-t border-line pt-5 text-sm leading-6 text-muted"><p className="font-semibold text-ink">Private sign-in is unavailable.</p><p className="mt-2">GitHub OAuth is not enabled and verified for this deployment. The project owner must finish the Supabase provider setup; local Markdown exports still work without an account.</p></div>
        : <form action={requestGitHubSignIn} className="mt-6 space-y-4 border-t border-line pt-5">
          <input type="hidden" name="next" value={params.next && ['/briefs', '/explore', '/candidates'].includes(params.next) ? params.next : '/watchlists'} />
          <button className="btn btn-primary" type="submit">Continue with GitHub</button>
          <p className="text-xs leading-5 text-muted">Signing in may create an account. The account is used only to keep your private briefs separate from other users’ data.</p>
        </form>}
      {params.error && <p role="alert" className="mt-5 text-sm text-muted">{params.error === 'disabled' ? 'Sign-in is not configured for this deployment.' : params.error === 'oauth' ? 'GitHub sign-in could not be started. Try again later.' : 'Sign-in could not be started. Try again later.'}</p>}
    </section>
  </main>;
}
