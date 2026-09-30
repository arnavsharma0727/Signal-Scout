import Link from 'next/link';
import {serverSupabase} from '../../lib/server-supabase';

export const dynamic='force-dynamic';

function enabledFeeds(){try{return ['RSS_FEEDS_KR_JSON','RSS_FEEDS_US_JSON','RSS_FEEDS_JSON'].some(key=>JSON.parse(process.env[key]??'[]').length>0)}catch{return false}}
function utc(value:string|null){if(!value)return 'not recorded';return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'numeric',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'}).format(new Date(value))}

export default async function Sources(){
  const db=serverSupabase();
  const {data:runs}=db?await db.from('connector_runs').select('connector_name,status,completed_at,items_stored').order('started_at',{ascending:false}).limit(40):{data:[]};
  const latest=new Map<string,any>();
  for(const run of runs??[])if(run.connector_name&&!latest.has(run.connector_name))latest.set(run.connector_name,run);
  const sources=[
    {name:'RSS / Atom',key:'rss',enabled:process.env.RSS_ENABLED==='true'&&enabledFeeds(),detail:'Configured feeds are the active Korean- and U.S.-side news sources. Publisher terms and reuse rights vary.'},
    {name:'Hacker News comments',key:'hacker-news',enabled:process.env.HACKER_NEWS_ENABLED==='true',detail:'Keyless public comments; a narrow U.S.-leaning discussion sample, not a matched Korea/U.S. forum comparison.'},
    {name:'GDELT news',key:'gdelt',enabled:process.env.GDELT_ENABLED==='true',detail:process.env.GDELT_ENABLED==='true'?'Configured; previous runs encountered rate limiting.':'Disabled after HTTP 429 rate limiting.'},
    {name:'Bluesky public posts',key:'bluesky',enabled:process.env.BLUESKY_ENABLED==='true',detail:process.env.BLUESKY_ENABLED==='true'?'Configured; previous runs encountered access failures.':'Disabled after HTTP 403 access failures.'},
    {name:'SEC EDGAR',key:'sec-edgar',enabled:Boolean(process.env.SEC_USER_AGENT),detail:'Official U.S. filing metadata; not part of the current homepage evidence stream. Requires a declared User-Agent and fair-access limits.'},
  ];
  return <div className="min-h-screen"><header className="shell flex h-20 items-center justify-between border-b border-line"><Link href="/" className="font-extrabold">SIGNAL SCOUT</Link><Link href="/" className="text-sm text-muted">← Signal Scout</Link></header><main className="shell py-16"><div className="eyebrow mb-4">Source configuration and health</div><h1 className="mb-4 text-4xl font-extrabold">Sources</h1><p className="mb-10 max-w-2xl leading-7 text-muted">Configured does not mean recently successful. Korean-side discussion sources are not currently available, and counts are collected records—not representative measures of investor opinion.</p><div className="grid gap-4 md:grid-cols-2">{sources.map(source=>{const run=latest.get(source.key);return <div className="panel p-6" key={source.name}><div className="flex items-center justify-between gap-4"><h2 className="font-bold">{source.name}</h2><span className="mono rounded-full border border-line px-3 py-1 text-[10px] uppercase text-ink">{source.enabled?'enabled':'off'}</span></div><p className="mt-2 text-sm text-muted">{source.detail}</p><p className="mt-4 border-t border-line pt-3 text-xs text-muted">Latest run: {run?`${run.status} · ${utc(run.completed_at)} · ${run.items_stored??0} new records`:'no recorded run'}</p></div>})}</div><p className="mt-8 text-xs text-muted">Failed run details are intentionally reduced to safe error codes; request URLs, response bodies, and credentials are not shown.</p></main></div>
}
