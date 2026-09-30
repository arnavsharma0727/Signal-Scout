import Link from "next/link";
import { serverSupabase } from "../../lib/server-supabase";
import { isHackerNewsIngestionEnabled } from "../../lib/source-policy";
import { getDisplayTimeZone } from "../../lib/display-timezone";
import { formatTimestamp } from "../../lib/format-time";

export const dynamic = "force-dynamic";

function enabledFeeds() {
  try {
    return ["RSS_FEEDS_KR_JSON", "RSS_FEEDS_US_JSON", "RSS_FEEDS_JSON"].some(
      (key) => {
        const feeds = JSON.parse(process.env[key] ?? "[]");
        return (
          Array.isArray(feeds) &&
          feeds.some((value: string) => {
            try {
              const url = new URL(value);
              return (
                ["http:", "https:"].includes(url.protocol) &&
                url.hostname !== "news.google.com" &&
                !url.hostname.endsWith(".news.google.com")
              );
            } catch {
              return false;
            }
          })
        );
      },
    );
  } catch {
    return false;
  }
}
function utc(
  value: string | null,
  timeZone: import("../../lib/time-zones").DisplayTimeZone,
) {
  if (!value) return "not recorded";
  return formatTimestamp(value, timeZone);
}

export default async function Sources() {
  const timeZone = await getDisplayTimeZone();
  const db = serverSupabase();
  const sources = [
    {
      name: "RSS / Atom",
      key: "rss",
      enabled: process.env.RSS_ENABLED === "true" && enabledFeeds(),
      detail: enabledFeeds()
        ? "Direct publisher feeds only; review each publisher’s terms before use."
        : "No direct publisher feeds configured. Google News redirect feeds are rejected; records linked only to news.google.com are excluded from the public evidence feed.",
    },
    {
      name: "Korea MOIS official releases",
      key: "mois-official-policy",
      enabled: process.env.MOIS_PRESS_RELEASES_ENABLED === "true",
      detail:
        "Optional no-key government-policy context, not investor discussion. Each linked article must show the KOGL Type 1 attribution license; only title, source link, and date are retained.",
    },
    {
      name: "Hacker News comments",
      key: "hacker-news",
      enabled: isHackerNewsIngestionEnabled(),
      detail:
        "Disabled unless collection and display rights are explicitly cleared. This is a narrow U.S.-leaning sample, not a matched Korea/U.S. forum comparison; prior records are withheld from public evidence views while rights remain under review.",
    },
    {
      name: "Stack Exchange · international Q&A",
      key: "stack-exchange",
      enabled: process.env.STACK_EXCHANGE_ENABLED === "true",
      detail:
        "Keyless daily collection across nine communities plus one-query-at-a-time live Explore search. Only individually CC BY-SA 4.0 items are retained in scheduled ingestion or shown in Explore, with author and license attribution. This remains expert Q&A, not representative public opinion; on-demand results are not stored.",
    },
    {
      name: "GDELT news",
      key: "gdelt",
      enabled: process.env.GDELT_ENABLED === "true",
      detail:
        process.env.GDELT_ENABLED === "true"
          ? "One global query per daily ingestion, capped at 50 results and paced to GDELT’s five-second guidance. This is news discovery metadata, not forum discussion; reuse is cited to the GDELT Project."
          : "Disabled after HTTP 429 rate limiting.",
    },
    {
      name: "Bluesky public posts",
      key: "bluesky",
      enabled: process.env.BLUESKY_ENABLED === "true",
      detail:
        process.env.BLUESKY_ENABLED === "true"
          ? "The documented public AppView endpoint is configured, but requests have returned HTTP 403. It remains off pending authorized access, reuse rights, and deletion/retention review."
          : "Disabled after the documented public AppView endpoint returned HTTP 403; no access-control workaround is used.",
    },
    {
      name: "YouTube public comments (candidate)",
      key: "youtube-comments",
      enabled: false,
      detail:
        "Not implemented. Requires a Google API key; the default free quota is limited, API data must be refreshed or deleted within 30 days, and derived analytics require approved use-case terms. Selected video comments are not a representative investor-forum sample.",
    },
    {
      name: "SEC EDGAR",
      key: "sec-edgar",
      enabled: Boolean(process.env.SEC_USER_AGENT),
      detail:
        "Official U.S. filing metadata; not part of the current homepage evidence stream. Requires a declared User-Agent and fair-access limits.",
    },
  ];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const health = await Promise.all(
    sources.map(async (source) => {
      if (!db) return { source, runs: [] as any[] };
      const { data } = await db
        .from("connector_runs")
        .select("status,started_at,completed_at,items_stored")
        .eq("connector_name", source.key)
        .order("started_at", { ascending: false })
        .limit(500);
      const all = data ?? [];
      return {
        source,
        runs: all.filter((run) => run.started_at >= since),
        latest: all[0],
        lastSuccess: all.find(
          (run) => run.status === "completed" || run.status === "partial",
        ),
      };
    }),
  );
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/" className="text-sm text-muted">
          ← Signal Scout
        </Link>
      </header>
      <main className="shell py-16">
        <div className="eyebrow mb-4">Source configuration and health</div>
        <h1 className="mb-4 text-4xl font-extrabold">Sources</h1>
        <p className="mb-10 max-w-2xl leading-7 text-muted">
          Configured does not mean recently successful. The cleared discussion
          connector is a narrow, query-selected Stack Exchange sample across
          five languages; counts are not representative measures of public
          opinion.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {health.map(({ source, runs, latest, lastSuccess }) => {
            const errors = runs.filter(
              (run) => run.status === "failed" || run.status === "partial",
            ).length;
            const rate = runs.length
              ? Math.round((errors / runs.length) * 100)
              : null;
            const stale =
              source.enabled &&
              (!lastSuccess ||
                Date.now() -
                  Date.parse(
                    lastSuccess.completed_at ?? lastSuccess.started_at,
                  ) >
                  48 * 60 * 60 * 1000);
            const status = !source.enabled
              ? "off"
              : stale
                ? "stale"
                : latest?.status === "failed"
                  ? "error"
                  : "current";
            return (
              <div className="panel p-6" key={source.name}>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-bold">{source.name}</h2>
                  <span className="mono rounded-full border border-line px-3 py-1 text-[10px] uppercase text-ink">
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{source.detail}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
                  <dt className="text-muted">Last success</dt>
                  <dd>
                    {lastSuccess
                      ? utc(lastSuccess.completed_at, timeZone)
                      : "none recorded"}
                  </dd>
                  <dt className="text-muted">Records stored / 24h</dt>
                  <dd>
                    {runs.reduce(
                      (sum, run) => sum + (run.items_stored ?? 0),
                      0,
                    )}
                  </dd>
                  <dt className="text-muted">Run error rate / 24h</dt>
                  <dd>
                    {rate === null
                      ? "no runs"
                      : `${rate}% (${errors}/${runs.length})`}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-xs text-muted">
          Failed run details are intentionally reduced to safe error codes;
          request URLs, response bodies, and credentials are not shown. A source
          is marked stale after 48 hours without a successful run.
        </p>
      </main>
    </div>
  );
}
