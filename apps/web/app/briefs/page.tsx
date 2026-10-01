import Link from 'next/link';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';
import { deleteResearchBrief } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My private briefs | Signal Scout' };

type SavedBrief = {
  id: string;
  topic: string;
  working_thesis: string;
  alternatives: string;
  disconfirming_evidence: string;
  evidence_links: Array<{ url: string; host: string; sourceClass: string; language: string; publishedAt: string | null; assessment?: string; licenseUrl: string | null }>;
  excluded_evidence_count: number;
  created_at: string;
};

export default async function BriefsPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const params = await searchParams;
  const db = authConfigured() ? await authServerClient() : null;
  const { data: { user } } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!db || !user) return <main className="shell min-h-[75vh] py-16"><header className="mb-12 flex items-center justify-between border-b border-line pb-5"><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><Link href="/explore" className="text-sm text-muted">← Explore</Link></header><section className="panel max-w-2xl p-7"><div className="eyebrow">Your research</div><h1 className="mt-3 text-3xl font-bold">Private research briefs</h1><p className="mt-3 leading-6 text-muted">Sign in to keep your own working notes and approved source links private to your account.</p><Link className="btn btn-primary mt-6" href="/login?next=%2Fbriefs">Sign in to continue</Link></section></main>;

  const { data } = await db.from('research_briefs').select('id,topic,working_thesis,alternatives,disconfirming_evidence,evidence_links,excluded_evidence_count,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  const briefs = (data ?? []) as SavedBrief[];
  return <main className="shell min-h-screen py-12">
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5"><div><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><div className="mt-2 text-xs text-muted">Private workspace · {user.email}</div></div><Link className="btn" href="/explore">Explore discussions</Link></header>
    <div className="eyebrow">Your research</div><h1 className="mt-2 text-3xl font-bold">Private research briefs</h1>
    <p className="mt-3 max-w-3xl leading-6 text-muted">Only you can access these saved notes. The app stores the text you submit and link-only citations from approved sources. It does not store search queries, source titles, excerpts, post bodies, or contributor handles. Briefs are not public or automated leads.</p>
    {params.saved && <p role="status" className="mt-5 text-sm">Brief saved to your private workspace.</p>}{params.deleted && <p role="status" className="mt-5 text-sm">Brief deleted.</p>}{params.error && <p role="alert" className="mt-5 text-sm">The brief could not be deleted.</p>}
    {!briefs.length ? <section className="panel mt-7 p-7"><p className="text-sm text-muted">No saved briefs yet. Explore live sources, add evidence deliberately, and save a topic brief.</p><Link className="btn btn-primary mt-4" href="/explore">Open Explore</Link></section> : <div className="mt-7 space-y-5">{briefs.map((brief) => <article className="panel p-5 md:p-7" key={brief.id}>
      <header className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">Research brief · private</div><h2 className="mt-2 text-xl font-semibold">{brief.topic}</h2><p className="mt-1 text-xs text-muted">Saved {new Date(brief.created_at).toLocaleString()}</p></div><form action={deleteResearchBrief}><input type="hidden" name="id" value={brief.id}/><button className="btn" type="submit">Delete</button></form></header>
      <Note label="Working thesis" value={brief.working_thesis}/><Note label="Alternative explanations and counter-evidence" value={brief.alternatives}/><Note label="What would change my mind?" value={brief.disconfirming_evidence}/>
      <section className="mt-5 border-t border-line pt-4"><h3 className="font-semibold">Approved source links ({brief.evidence_links.length})</h3>{brief.excluded_evidence_count > 0 && <p className="mt-1 text-xs text-muted">{brief.excluded_evidence_count} selected item(s) were not retained because the source is not on the link-retention allowlist.</p>}
        {brief.evidence_links.length ? <ul className="mt-2 divide-y divide-line">{brief.evidence_links.map((item, index) => <li className="py-3" key={`${item.url}-${index}`}><a className="break-all text-sm font-medium underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.host}</a><p className="mt-1 text-xs text-muted">{item.sourceClass} · {item.language}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleString()}` : ''}{item.assessment ? ` · your assessment: ${item.assessment}` : ''}{item.licenseUrl ? <> · <a className="underline" href={item.licenseUrl} target="_blank" rel="noreferrer">license</a></> : ''}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted">No source links from the approved retention list.</p>}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted">Exploratory notes only; not a verified conclusion, representative sample, or investment recommendation.</p>
    </article>)}</div>}
    <p className="mt-7 text-xs text-muted">Up to 100 briefs are retained per account. Delete a brief here to remove it.</p>
  </main>;
}

function Note({ label, value }: { label: string; value: string }) {
  return <section className="mt-5"><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{value || 'Not written.'}</p></section>;
}
