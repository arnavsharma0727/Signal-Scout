import Link from 'next/link';

export const dynamic='force-dynamic';

function enabledFeeds(){try{return ['RSS_FEEDS_KR_JSON','RSS_FEEDS_US_JSON','RSS_FEEDS_JSON'].some(key=>JSON.parse(process.env[key]??'[]').length>0)}catch{return false}}

export default function Sources(){
  const sources=[
    {name:'GDELT news',enabled:process.env.GDELT_ENABLED==='true',detail:'Free global news discovery; no key.'},
    {name:'RSS / Atom',enabled:process.env.RSS_ENABLED==='true'&&enabledFeeds(),detail:'Configured publisher feeds; feed terms apply.'},
    {name:'Bluesky public posts',enabled:process.env.BLUESKY_ENABLED==='true',detail:'Public post search; no key. Not representative of all investors.'},
    {name:'Hacker News comments',enabled:process.env.HACKER_NEWS_ENABLED==='true',detail:'Keyless public comments; a narrow U.S.-leaning discussion sample.'},
    {name:'SEC EDGAR',enabled:Boolean(process.env.SEC_USER_AGENT),detail:'Free US regulatory filings; requires a contact in the User-Agent.'},
  ];
  return <div className="min-h-screen"><header className="shell flex h-20 items-center justify-between border-b border-line"><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><Link href="/" className="text-sm text-muted">← Research Radar</Link></header><main className="shell py-16"><div className="eyebrow mb-4">Source configuration</div><h1 className="mb-4 text-4xl font-extrabold">Configured sources</h1><p className="mb-10 max-w-2xl leading-7 text-muted">Enabled means configured in this runtime, not that a recent fetch succeeded. Coverage varies by source and is never a representative census of investors.</p><div className="grid gap-4 md:grid-cols-2">{sources.map(source=><div className="panel flex items-center justify-between gap-4 p-6" key={source.name}><div><h2 className="font-bold">{source.name}</h2><p className="mt-2 text-sm text-muted">{source.detail}</p></div><span className="mono rounded-full border border-line px-3 py-1 text-[10px] uppercase text-ink">{source.enabled?'enabled':'off'}</span></div>)}</div><p className="mt-8 text-xs text-muted">Respect source terms, quotas, attribution, caching, and rate limits. Research only; not investment advice.</p></main></div>
}
