import Link from "next/link";
import SiteHeader from "../../components/site-header";
import { serverSupabase } from "../../lib/server-supabase";
import { isHackerNewsIngestionEnabled } from "../../lib/source-policy";
import { getDisplayTimeZone } from "../../lib/display-timezone";
import { formatTimestamp } from "../../lib/format-time";
import { summarizeConnectorRuns } from "../../lib/source-health";

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

function globalVoicesEditionSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("editionResults" in metadata) || !Array.isArray(metadata.editionResults)) return null;
  const labels: Record<string, string> = { en: "English", es: "Spanish", fr: "French", pt: "Portuguese", ar: "Arabic", ru: "Russian", it: "Italian", nl: "Dutch", yo: "Yoruba", uk: "Ukrainian", el: "Greek", ca: "Catalan" };
  const results = metadata.editionResults.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    if (typeof item.language !== "string" || !labels[item.language]) return [];
    if (item.status === "failed") return [`${labels[item.language]}: unavailable`];
    if (typeof item.feedItemsReceived !== "number" || typeof item.documentsAccepted !== "number" ||
      !Number.isInteger(item.feedItemsReceived) || !Number.isInteger(item.documentsAccepted) ||
      item.feedItemsReceived < 0 || item.documentsAccepted < 0 || item.documentsAccepted > item.feedItemsReceived) return [];
    return [`${labels[item.language]}: ${item.documentsAccepted} eligible / ${item.feedItemsReceived} feed entries`];
  });
  return results.length ? results.join(" · ") : null;
}

type SourceConfig = {
  name: string;
  key: string;
  enabled: boolean;
  detail: string;
  referenceUrl?: string;
  referenceLabel?: string;
  secondaryReferenceUrl?: string;
  secondaryReferenceLabel?: string;
  additionalReferences?: { url: string; label: string }[];
  onDemand?: boolean;
};

export default async function Sources() {
  const timeZone = await getDisplayTimeZone();
  const db = serverSupabase();
  const sources: SourceConfig[] = [
    {
      name: "GDELT · global news index",
      key: "gdelt",
      enabled: true,
      onDemand: true,
      referenceUrl: "https://www.gdeltproject.org/",
      referenceLabel: "GDELT Project",
      secondaryReferenceUrl: "https://www.ap.org/about/",
      secondaryReferenceLabel: "Associated Press · about and structure",
      additionalReferences: [
        { url: "https://www.theguardian.com/about", label: "The Guardian · ownership" },
        { url: "https://www.thomsonreuters.com/en/products-services/news-media", label: "Reuters · news and media" },
      ],
      detail:
        "Optional visitor-triggered search of the last seven days in GDELT's multilingual index, capped at 25 results, through a first-party no-store bridge. Searches are not persisted; GDELT may be slow or rate-limited and no automatic retry is sent. The app assigns reviewed source-operator labels only to original HTTPS article URLs on apnews.com, theguardian.com, or reuters.com; GDELT's own domain/title fields do not establish publisher identity. These labels identify an outlet group only—they do not prove independent reporting on a particular claim. Other publishers remain unresolved. Publisher country describes the outlet, not its audience. Headlines remain publisher material; this is news discovery, not forum discussion or independent-source corroboration.",
    },
    {
      name: "RSS / Atom",
      key: "rss",
      enabled: process.env.RSS_ENABLED === "true" && enabledFeeds(),
      detail: enabledFeeds()
        ? process.env.RSS_ENABLED === "true"
          ? "Optional custom publisher feeds are enabled. Review each publisher’s terms before use. Licensed Global Voices and The Conversation feeds, and the European Commission feed, are listed separately with their own rules and run health."
          : "Custom publisher feed URLs are configured, but this connector is disabled by RSS_ENABLED. Licensed Global Voices and The Conversation feeds, and the European Commission feed, are listed separately with their own rules and run health."
        : "No approved custom publisher feeds are configured for this optional connector. Licensed Global Voices and The Conversation feeds, and the European Commission feed, are listed separately with their own rules and run health. Google News redirect feeds are rejected.",
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
        "The official Firebase API is public and keyless, but public API access is not a reuse license. YC’s current Terms prohibit unapproved scraping/data extraction and commercial reuse of site content, so Signal Scout keeps this source disabled until its collection and display rights are explicitly cleared. This would also be a narrow U.S.-leaning community, not a matched international sample; any prior records remain withheld from public evidence views.",
      referenceUrl: "https://github.com/HackerNews/API",
      referenceLabel: "Official public API documentation",
      secondaryReferenceUrl: "https://www.ycombinator.com/legal/",
      secondaryReferenceLabel: "Y Combinator Terms and Privacy Policy",
    },
    {
      name: "Stack Exchange · international Q&A",
      key: "stack-exchange",
      enabled: process.env.STACK_EXCHANGE_ENABLED === "true",
      detail:
        "Keyless daily collection samples the latest public questions from 12 communities across economics, quantitative finance, personal finance, politics, law, AI, data science, information security, and four non-English Stack Overflow editions. Each community is bounded to one API page of up to 100 questions from the last 30 days. Only individually CC BY-SA 4.0 items are retained, with unmodified title, original link, author/profile attribution, site, tags, and license; question and answer bodies are discarded. Explore offers on-demand title searches across up to four selected communities with a separately supplied phrase for each language. This is specialist Q&A from one platform operator, not a general forum, independent operators, or representative public opinion; feed caps omit older/lower-ranked items and on-demand results are not stored.",
    },
    {
      name: "Typst Forum · licensed community discussion",
      key: "typst-forum",
      enabled: true,
      detail:
        "Daily keyless request to the forum's public latest RSS feed. Only titles posted on or after the forum's CC BY 4.0 effective cutoff, named author attribution, date, and original topic link are retained; summaries and post bodies are discarded. This is a narrow software-typesetting community, not financial discussion or a proxy for population opinion. Forum locale is not used to infer language or geography; one operator only.",
    },
    {
      name: "Fedora Discussion · licensed community forum",
      key: "fedora-discussion",
      enabled: true,
      referenceUrl: "https://discussion.fedoraproject.org/tos",
      referenceLabel: "Fedora Discussion terms",
      detail:
        "One daily keyless request to the public Discourse latest-topics endpoint, capped at 30 topics. Fedora Discussion's terms require acceptable contributor licenses and specify CC BY-SA 4.0 as the default. Only the unmodified title, original-poster username for attribution, topic link, latest-activity timestamp, and reply-count snapshot are retained; profile details, post bodies, replies, and topic tags are discarded. This is a selected Fedora/Linux community sample, not financial discussion, broad public opinion, or a proxy for users' geography. The daily endpoint is incomplete and can resurface old topics; activity timestamps do not mean a new topic.",
    },
    {
      name: "Mastodon · public hashtag timelines (4 server views)",
      key: "mastodon-public",
      enabled: true,
      onDemand: true,
      detail:
        "Optional visitor-triggered trend discovery requests up to 10 public hashtag suggestions from each of four fixed Mastodon servers; each server’s internal trend ranking stays separate, with no merged score or storage. A visitor can supply a distinct hashtag for each selected server in a one- or four-server comparison, useful for manually entered language variants. Each server receives only its own query; exact hashtags stay attached to separate server views. Up to 20 public posts per server are transiently shown with author/origin links and content warnings; overlapping statuses are deduplicated and per-server counts are not summed. Instance information links are provided and the visitor must affirm review before a request; Signal Scout does not accept terms for them. Servers are not country proxies. Content remains author-owned and no blanket license is implied. Nothing is stored or analyzed. Not a global timeline or representative measure.",
    },
    {
      name: "Lemmy · public federated forum view",
      key: "lemmy-public",
      enabled: true,
      onDemand: true,
      detail:
        "Visitor-triggered, keyless search of up to 20 newest matching posts per selected instance: lemmy.world, discuss.tchncs.de, feddit.org, and feddit.uk. Each server can receive a separately supplied phrase for cross-language exploration; queries go directly from the browser to that server and are not translated or persisted by Signal Scout. A short post-text excerpt is shown only in the visitor's browser for manual relevance review; selecting a citation strips the excerpt, and neither query nor post text is sent to Signal Scout or saved. Bot-marked, NSFW, removed, stale, future-dated, and unlinked items are filtered. The views are separate and incomplete; federation can duplicate the same post, and these are not independent samples, a global timeline, country proxy, representative population sample, or measure of attention. feddit.uk requires users to be over 18. Posts remain their authors’ content; no blanket license is implied. Visitors must review the selected instance’s legal/privacy information and explicitly confirm before searching.",
    },
    {
      name: "Wikimedia · article talk pages",
      key: "wikimedia-talk",
      enabled: true,
      onDemand: true,
      detail:
        "Two modes: visitor-triggered, transient topic search across ten language editions; and one daily keyless scheduled sample of up to 500 newest non-bot, non-minor edits to article talk pages per edition. Scheduled records contain only the unchanged page title, timestamp, edition, and exact revision link; comment text, edit summaries, usernames, and IPs are never requested or stored. The linked revision/history supplies attribution under the applicable project license, usually CC BY-SA 4.0 (with GFDL also applying to many text contributions). Edition samples are capped, language is not audience geography, and collaborative editorial activity is not general investor sentiment or a lead by itself.",
    },
    {
      name: "Wikinews · archived, not a live source",
      key: "wikinews-public",
      enabled: false,
      referenceUrl: "https://meta.wikimedia.org/w/index.php?oldid=30328679#Board_of_Trustees_Approves_Closure_of_Wikinews",
      referenceLabel: "Wikimedia Foundation closure notice",
      detail:
        "The Wikimedia Foundation closed all Wikinews editions effective 2026-05-04; they are read-only archives. A live API search returned only 2024 English results, so Signal Scout removed Wikinews from current-source searches. Archived content is not used as current evidence. See the Wikimedia Foundation’s project-closure announcement and the current distribution list.",
    },
    {
      name: "European Commission Presscorner · official context",
      key: "european-commission-presscorner",
      enabled: true,
      detail:
        "Daily keyless English RSS collection from the European Commission. Only headlines, dates, and original links are retained; attribution is attached under the Commission’s CC BY 4.0 default reuse notice, except items carrying a different notice. This is official institutional context, not independent reporting, public discussion, or a measure of attention.",
    },
    {
      name: "The Conversation · licensed expert analysis",
      key: "the-conversation",
      enabled: true,
      detail:
        "Daily keyless Atom collection from the English Australia, U.S., U.K., Canada, Africa, and New Zealand editions. Each retained feed entry must explicitly carry a Creative Commons attribution/no-derivatives notice. Signal Scout keeps the unmodified headline, author byline, publication date, original link, edition, and rights notice; summaries and article bodies are discarded. These are editions within one publisher network, not independent outlets or proxies for audience location; this expert analysis is distinct from forum discussion and breaking-news coverage.",
    },
    {
      name: "Global Voices · international community reporting",
      key: "global-voices",
      enabled: true,
      detail:
        "Daily keyless RSS from twelve active Global Voices editions: English, Spanish, French, Portuguese, Arabic, Russian, Italian, Dutch, Yoruba, Ukrainian, Greek, and Catalan. Each edition is identified from its allowlisted publisher host/title; RSS language metadata is inconsistent, so the reviewed edition supplies the language label. Global Voices-created content defaults to CC BY 3.0 unless an item says otherwise; conflicting item-level rights are rejected. Signal Scout keeps the unmodified edition headline, byline, date, first-party link, and limited categories with attribution; descriptions, story bodies, and media are discarded. Items are limited to a rolling seven-day publication window. Editions share one publisher and may include translated versions; they are never counted as independent outlets or proxies for audience geography. This is editorial reporting, not raw forum discussion or a representative survey.",
    },
    {
      name: "Bluesky · transient public search",
      key: "bluesky",
      enabled: false,
      onDemand: true,
      referenceUrl: "https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/unspecced/getTrends.json",
      referenceLabel: "Bluesky getTrends API lexicon",
      secondaryReferenceUrl: "https://docs.bsky.app/docs/advanced-guides/api-directory",
      secondaryReferenceLabel: "Bluesky API hosts and authentication",
      detail:
        "Explore also offers visitor-triggered topic discovery via the unauthenticated public.api.bsky.app getTrends endpoint, an experimental (unspecced) API that may change or become unavailable; a 10-second timeout surfaces failures. It displays at most eight provider-ranked labels with Bluesky-reported metadata, without saving them. Choosing a label only fills the phrase-search form; the visitor must separately run the sweep and review resulting original sources. This ranking is not geographic, representative, independently verified, or evidence of attention or a market signal. The separate query search shows up to 25 recent indexed results transiently with a source link, author handle, date, and available language metadata. Researchers can run separate manually entered language phrases; each capped query remains a separate, non-comparable sample, and language metadata may be missing. Post text is discarded from the app's citation model; nothing is sent to Signal Scout or persisted. The search index is incomplete, posts remain their authors’ content, and results are not a representative sample. Scheduled ingestion and retention of Bluesky post content are disabled pending a reviewed rights, deletion, and retention basis.",
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
      if (!db) return { source, runs: [] as any[], latest: undefined, lastSuccess: undefined, historyCapped: false, historyIncomplete: false };
      const pageSize = 500;
      const maxPages = 10;
      const recent: any[] = [];
      let historyCapped = false;
      let historyIncomplete = false;
      for (let page = 0; page < maxPages; page += 1) {
        const from = page * pageSize;
        const { data, error } = await db
          .from("connector_runs")
          .select("id,status,started_at,completed_at,items_stored,metadata_json")
          .eq("connector_name", source.key)
          .gte("started_at", since)
          .order("started_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error || !data) {
          historyIncomplete = true;
          break;
        }
        recent.push(...data);
        if (data.length < pageSize) break;
        if (page === maxPages - 1) historyCapped = true;
      }
      const [latestResult, lastSuccessResult] = await Promise.all([
        db
          .from("connector_runs")
          .select("status,started_at,completed_at,items_stored,metadata_json")
          .eq("connector_name", source.key)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from("connector_runs")
          .select("status,started_at,completed_at,items_stored,metadata_json")
          .eq("connector_name", source.key)
          .in("status", ["completed", "partial"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        source,
        runs: recent,
        latest: latestResult.data ?? undefined,
        lastSuccess: lastSuccessResult.data ?? undefined,
        historyCapped,
        historyIncomplete,
      };
    }),
  );
  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
      <main className="shell py-16">
        <div className="eyebrow mb-4">Source configuration and health</div>
        <h1 className="mb-4 text-4xl font-extrabold">Sources</h1>
        <p className="mb-10 max-w-2xl leading-7 text-muted">
          Configured does not mean recently successful. Discussion inputs
          include broad licensed Stack Exchange expert Q&amp;A and narrow,
          licensed Typst and Fedora community forums. Each source has a
          different audience and coverage; none is a representative measure of
          public opinion. Check each source&apos;s health and limits below.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {health.map(({ source, runs, latest, lastSuccess, historyCapped, historyIncomplete }) => {
            const summary = summarizeConnectorRuns(runs);
            const stale =
              !source.onDemand &&
              source.enabled &&
              (!lastSuccess ||
                Date.now() -
                  Date.parse(
                    lastSuccess.completed_at ?? lastSuccess.started_at,
                  ) >
                  48 * 60 * 60 * 1000);
            const status = source.onDemand
              ? "on demand"
              : !source.enabled
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
                {source.referenceUrl && (
                  <a className="mt-2 inline-block text-xs underline text-muted" href={source.referenceUrl} target="_blank" rel="noreferrer">
                    {source.referenceLabel ?? "Source policy"}
                  </a>
                )}
                {source.secondaryReferenceUrl && (
                  <a className="ml-4 mt-2 inline-block text-xs underline text-muted" href={source.secondaryReferenceUrl} target="_blank" rel="noreferrer">
                    {source.secondaryReferenceLabel ?? "Additional source policy"}
                  </a>
                )}
                {source.additionalReferences?.map((reference) => (
                  <a key={reference.url} className="ml-4 mt-2 inline-block text-xs underline text-muted" href={reference.url} target="_blank" rel="noreferrer">
                    {reference.label}
                  </a>
                ))}
                {source.onDemand ? (
                  <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                    Visitor-triggered only. No database records or automated run-health history.
                  </p>
                ) : <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
                  <dt className="text-muted">Last success</dt>
                  <dd>
                    {lastSuccess
                      ? utc(lastSuccess.completed_at, timeZone)
                      : "none recorded"}
                  </dd>
                  <dt className="text-muted">Latest run result</dt>
                  <dd>
                    {latest
                      ? `${latest.status} · ${latest.items_stored ?? 0} stored · ${utc(latest.started_at, timeZone)}`
                      : "none recorded"}
                  </dd>
                  {source.key === "global-voices" && globalVoicesEditionSummary(latest?.metadata_json) && (
                    <>
                      <dt className="text-muted">Latest edition results</dt>
                      <dd className="col-span-2 leading-5">{globalVoicesEditionSummary(latest?.metadata_json)}</dd>
                    </>
                  )}
                  <dt className="text-muted">Records stored / 24h</dt>
                  <dd>{historyCapped || historyIncomplete ? `at least ${summary.recordsStored}` : summary.recordsStored}</dd>
                  <dt className="text-muted">{source.enabled ? "Run error rate / 24h" : "Recorded run outcomes / 24h · source off"}</dt>
                  <dd>
                    {summary.errorRatePercent === null
                      ? "no runs"
                      : source.enabled
                        ? `${summary.errorRatePercent}% (${summary.unsuccessfulRuns}/${summary.runCount})`
                        : `${summary.unsuccessfulRuns} unsuccessful / ${summary.runCount} recorded`}
                    {historyCapped ? " · history sample capped at 5,000 runs" : historyIncomplete ? " · history query incomplete" : ""}
                  </dd>
                </dl>}
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-xs text-muted">
          Run-health figures cover all fetched records from the previous 24
          hours, up to 5,000 per source. Failed run details are intentionally
          reduced to safe error codes; request URLs, response bodies, and
          credentials are not shown. A source is marked stale after 48 hours
          without a successful run.
        </p>
      </main>
    </div>
  );
}
