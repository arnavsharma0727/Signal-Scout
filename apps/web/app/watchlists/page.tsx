import Link from 'next/link';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';
import { addTicker, createWatchlist, deleteWatchlist, importTickers, removeTicker, signOut } from './actions';

export const dynamic = 'force-dynamic';

type Watchlist = { id: string; name: string; created_at: string };
type Member = { watchlist_id: string; company_id: string; company: { ticker: string; company_name_en: string } | null };

export default async function WatchlistsPage({ searchParams }: { searchParams: Promise<{ error?: string; imported?: string; missing?: string }> }) {
  const params = await searchParams;
  const db = authConfigured() ? await authServerClient() : null;
  const { data: { user } } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!db || !user) return <main className="shell min-h-[75vh] py-16"><header className="mb-12 flex items-center justify-between border-b border-line pb-5"><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><Link href="/" className="text-sm text-muted">← Back</Link></header><section className="panel max-w-2xl p-7"><div className="eyebrow">Your research</div><h1 className="mt-3 text-3xl font-bold">Private watchlists</h1><p className="mt-3 leading-6 text-muted">Collect entities you want to follow across the available Korea and U.S. source samples.</p><Link className="btn btn-primary mt-6" href="/login">Sign in to continue</Link></section></main>;

  const { data: lists } = await db.from('watchlists').select('id,name,created_at').order('created_at', { ascending: false });
  const watchlists = (lists ?? []) as Watchlist[];
  const { data: membershipRows } = watchlists.length
    ? await db.from('watchlist_companies').select('watchlist_id,company_id,company:companies(ticker,company_name_en)').in('watchlist_id', watchlists.map((list) => list.id))
    : { data: [] };
  const members = (membershipRows ?? []) as unknown as Member[];
  return <main className="shell min-h-[75vh] py-12">
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5"><div><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><div className="mt-2 text-xs text-muted">Private workspace · {user.email}</div></div><form action={signOut}><button className="btn" type="submit">Sign out</button></form></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">Your research</div><h1 className="mt-2 text-3xl font-bold">Watchlists</h1></div><Link className="btn" href="/companies">Browse profiles</Link></div>
    <p className="mt-3 max-w-2xl leading-6 text-muted">These lists are private to your account. Adding a profile organizes research; it does not imply eligible source coverage or a recommendation.</p>
    <section className="panel mt-7 p-5"><h2 className="font-semibold">Create a watchlist</h2><form action={createWatchlist} className="mt-3 flex max-w-xl gap-2"><label className="sr-only" htmlFor="watchlist-name">Watchlist name</label><input id="watchlist-name" name="name" className="min-w-0 flex-1 rounded border border-line px-3 py-2" placeholder="e.g. Semiconductors" maxLength={80} required/><button className="btn btn-primary" type="submit">Create</button></form></section>
    {params.error && <p role="alert" className="mt-5 text-sm text-muted">{watchlistError(params.error)}</p>}
    {params.imported && <p role="status" className="mt-5 text-sm">Imported {params.imported} profile(s). {params.missing ? `Not found: ${params.missing}` : ''}</p>}
    {watchlists.length === 0 ? <div className="panel mt-5 p-8 text-sm text-muted">No watchlists yet. Create one above to start.</div> : <div className="mt-5 space-y-5">{watchlists.map((list) => {
      const rows = members.filter((member) => member.watchlist_id === list.id);
      return <section className="panel p-5" key={list.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{list.name}</h2><p className="mt-1 text-xs text-muted">{rows.length} profile{rows.length === 1 ? '' : 's'} · private</p></div><div className="flex gap-2"><a className="btn" href={`/api/watchlists/${encodeURIComponent(list.id)}/export`}>Export CSV</a><form action={deleteWatchlist}><input type="hidden" name="watchlist_id" value={list.id}/><button className="btn" type="submit">Delete</button></form></div></div>
        <form action={addTicker} className="mt-5 flex max-w-xl gap-2"><input type="hidden" name="watchlist_id" value={list.id}/><label className="sr-only" htmlFor={`ticker-${list.id}`}>Profile ticker</label><input id={`ticker-${list.id}`} name="ticker" className="min-w-0 flex-1 rounded border border-line px-3 py-2" placeholder="Ticker, e.g. NVDA" required maxLength={24}/><button className="btn" type="submit">Add profile</button></form>
        <form action={importTickers} encType="multipart/form-data" className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="watchlist_id" value={list.id}/><label className="text-xs text-muted" htmlFor={`file-${list.id}`}>Import CSV (column: ticker, up to 200 rows)</label><input id={`file-${list.id}`} name="file" type="file" accept=".csv,text/csv" required className="max-w-full text-xs"/><button className="btn" type="submit">Import</button></form>
        {rows.length > 0 && <ul className="mt-4 divide-y divide-line border-t border-line">{rows.map((member) => <li className="flex items-center justify-between gap-4 py-3" key={member.company_id}><Link className="text-sm underline underline-offset-4" href={`/companies/${encodeURIComponent(member.company?.ticker ?? '')}`}>{member.company?.ticker} · {member.company?.company_name_en}</Link><form action={removeTicker}><input type="hidden" name="watchlist_id" value={list.id}/><input type="hidden" name="company_id" value={member.company_id}/><button className="text-xs text-muted underline underline-offset-4" type="submit">Remove</button></form></li>)}</ul>}
      </section>;
    })}</div>}
    <p className="mt-7 text-xs leading-5 text-muted">CSV import uses active profile tickers only. Lists are not shareable in this release; public sharing remains disabled.</p>
  </main>;
}

function watchlistError(code: string) {
  const messages: Record<string, string> = { name: 'Use a name of 1–80 characters.', create: 'Could not create that watchlist.', ticker: 'Enter a valid ticker.', notfound: 'That watchlist or active profile was not found.', add: 'Could not add the profile.', file: 'Choose a CSV file under 100 KB for an owned watchlist.', csv: 'CSV must include a ticker column and up to 200 valid ticker rows.', import: 'The CSV import could not be saved.' };
  return messages[code] ?? 'The requested watchlist change could not be completed.';
}
