import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Download,
  FileText,
  Globe2,
} from "lucide-react";
import { recentSourceDocuments } from "../lib/public-data";
import { getDisplayTimeZone } from "../lib/display-timezone";
import { formatTimestamp } from "../lib/format-time";
import {
  syntheticPreviewDocuments,
  syntheticTopicRows,
} from "../lib/synthetic-preview";
export const dynamic = "force-dynamic";
const nav = [
  ["Briefing", "/"],
  ["Explore", "/explore"],
  ["Profiles", "/companies"],
  ["Coverage", "/coverage"],
  ["Lead review", "/candidates"],
  ["Watchlists", "/watchlists"],
  ["Methodology", "/methodology"],
  ["Sources", "/sources"],
];
export default async function Home() {
  const timeZone = await getDisplayTimeZone();
  const evidence = await recentSourceDocuments();
  const preview =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_SYNTHETIC_PREVIEW === "true";
  const rows = preview ? syntheticTopicRows() : [];
  return (
    <div className="grid-bg min-h-screen">
      <header className="shell flex h-16 items-center justify-between border-b border-line">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-line text-xs font-bold">
            SS
          </span>
          <span className="font-bold tracking-tight">SIGNAL SCOUT</span>
        </Link>
        <nav className="hidden gap-7 text-sm text-muted md:flex">
          {nav.map(([n, h]) => (
            <Link key={h} href={h} className={h === "/" ? "text-ink" : ""}>
              {n}
            </Link>
          ))}
        </nav>
        <Link href="/about" className="btn">
          About <ArrowUpRight size={14} />
        </Link>
      </header>
      <main className="shell pb-20 pt-12">
        <div className="max-w-3xl">
          <div className="eyebrow mb-4">
            International research workspace · public conversation + sources
          </div>
          <h1>
            From conversation
            <br />
            to research thesis.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted">
            Follow live, public discussion and reporting into evidence-linked
            research questions. Coverage is source-specific—not a measure of
            what everyone thinks.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Collected samples only; the current release does not calculate
            topic leads unless source volume and evidence thresholds are met.
          </p>
          <Link className="btn btn-primary mt-6" href="/explore">
            Explore live discussion <ArrowUpRight size={15} />
          </Link>
        </div>
        {preview ? <PreviewPanel rows={rows} /> : <EmptyPanel />}
        <EvidencePanel documents={evidence} timeZone={timeZone} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Info
            icon={<FileText />}
            title="Source context"
            text="Original language, source, URL, and publication time stay attached."
            href="/sources"
          />
          <Info
            icon={<Globe2 />}
            title="International coverage"
            text="Sources are shown with their actual reach; no country or audience is inferred without evidence."
            href="/methodology"
          />
          <Info
            icon={<BookOpen />}
            title="Human review"
            text="Inspect the original material and source context before drawing conclusions."
            href="/methodology"
          />
        </div>
      </main>
    </div>
  );
}
function PreviewPanel({
  rows,
}: {
  rows: ReturnType<typeof syntheticTopicRows>;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 border border-line bg-white p-4 text-sm text-ink">
        <strong>Development preview.</strong> The records and metrics below are
        synthetic and are not displayed in production.
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-6">
            <div className="eyebrow">Conversation differences</div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-muted">
                Synthetic 3-day sample · KR and U.S.
              </p>
              <span className="mono text-xs text-muted">DEVELOPMENT</span>
            </div>
          </div>
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div
                className="grid gap-3 p-5 md:grid-cols-[1fr_auto]"
                key={r.topic}
              >
                <div>
                  <div className="text-sm font-bold">{r.topic}</div>
                  <div className="mt-1 text-xs text-muted">
                    KR {r.krCount} documents · U.S. {r.usCount} documents
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-xl">
                    {r.gap >= 0 ? "+" : ""}
                    {r.gap.toFixed(2)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    KR − U.S. share
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-6">
          <div className="eyebrow mb-6">Research notes</div>
          <h2 className="text-xl font-semibold">What differs?</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            This synthetic example contains more pricing and refund discussion
            in the Korean sample. It demonstrates the interface only.
          </p>
          <h2 className="mt-7 text-xl font-semibold">What to verify</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted">
            <li>Read the original Korean source.</li>
            <li>Compare matching time windows.</li>
            <li>Check for syndication and duplicates.</li>
            <li>Validate the topic taxonomy.</li>
          </ul>
        </section>
      </div>
      <div className="panel mt-4 overflow-hidden">
        <div className="border-b border-line p-5">
          <div className="eyebrow">Synthetic source records</div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {syntheticPreviewDocuments.map((d) => (
            <div className="rounded border border-line p-4" key={d.id}>
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted">
                <span>
                  {d.market} · {d.sourceType}
                </span>
                <span>{d.language}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{d.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted">{d.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function EmptyPanel() {
  return (
    <div className="panel mt-10 flex min-h-[260px] flex-col justify-between p-7 md:p-8">
      <div>
        <div className="eyebrow mb-6">Research status</div>
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight">No evidence-qualified thesis leads yet.</h2>
        <p className="mt-3 max-w-xl leading-7 text-muted">
          The available discussion sample is small and query-selected. The
          research queue surfaces repeated, licensed question tags for human
          review, but does not call them trends or infer a market thesis. News
          and discussion remain separate, and missing evidence is not treated as
          evidence of silence.
        </p>
      </div>
      <div>
        <Link className="btn btn-primary" href="/candidates">
          Review discussion observations <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
function EvidencePanel({ documents, timeZone }: { documents: any[]; timeZone: import("../lib/time-zones").DisplayTimeZone }) {
  const groups = [
    { key: "discussion", label: "Online discussion", matches: (d: any) => ["stack-exchange", "bluesky", "hacker-news"].includes(d.source_type) },
    { key: "news", label: "News and reporting", matches: (d: any) => ["rss", "gdelt"].includes(d.source_type) },
    { key: "context", label: "Official and other context", matches: (d: any) => !["stack-exchange", "bluesky", "hacker-news", "rss", "gdelt"].includes(d.source_type) },
  ];
  return (
    <section className="panel mt-5 overflow-hidden">
      <div className="border-b border-line p-6">
        <div className="eyebrow">Recent source evidence · 72 hours</div>
        <p className="mt-2 text-sm text-muted">
          Recent items are grouped by source class, not country. Original
          headlines and discussion samples stay separate; counts describe this
          selected collection only, not what a population believes.
        </p>
      </div>
      <div className="grid md:grid-cols-3">
        {groups.map(({ key, label, matches }) => {
          const rows = documents.filter(matches);
          const visible = rows.slice(0, 12);
          return (
            <div
              className="border-b border-line p-5 md:border-b-0 md:even:border-l"
              key={key}
            >
              <h2 className="mb-4 text-sm font-semibold">
                {label}{" "}
                <span className="ml-2 font-normal text-muted">
                  {rows.length} items sampled
                </span>
              </h2>
              {rows.length === 0 ? (
                <p className="text-sm text-muted">
                  {key === "news"
                    ? "No eligible recent headlines are available. Check source health for current outages."
                    : "No eligible recent items collected."}
                </p>
              ) : (
                <ul className="space-y-4">
                  {visible.map((d) => (
                    <li className="border-t border-line pt-3" key={d.id}>
                      <div className="flex justify-between gap-3 text-[10px] uppercase tracking-wider text-muted">
                        <span>
                          {d.source_type === "official-policy"
                            ? "Official institutional context · not public discussion"
                            : d.source_type === "hacker-news"
                              ? "Hacker News comment"
                            : d.source_type === "stack-exchange"
                                ? "Stack Exchange · expert Q&A"
                              : "RSS / news"}
                        </span>
                        <span>{d.language_code}</span>
                      </div>
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-sm font-medium leading-6 underline decoration-line underline-offset-4"
                      >
                        {d.title_original}
                      </a>
                      {d.excerpt_original && (
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">
                          {d.excerpt_original}
                        </p>
                      )}
                      {d.source_type === "stack-exchange" && (
                        <p className="mt-1 text-[10px] leading-4 text-muted">
                          <span className="font-medium">{d.source_name}</span>{" · "}
                          By {d.raw_metadata_json?.attributionName ?? "Stack Exchange contributor"}
                          {d.raw_metadata_json?.attributionUrl && (
                            <> · <a className="underline" href={d.raw_metadata_json.attributionUrl} target="_blank" rel="noreferrer">author profile</a></>
                          )}
                          {" · "}
                          <a className="underline" href={d.raw_metadata_json?.licenseUrl ?? "https://creativecommons.org/licenses/by-sa/4.0/"} target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
                          {" · title shown unmodified"}
                        </p>
                      )}
                      {d.source_type === "official-policy" && (
                        <p className="mt-1 text-[10px] leading-4 text-muted">
                          <span className="font-medium">{d.raw_metadata_json?.publisher ?? d.source_name}</span>
                          {d.raw_metadata_json?.license === "CC-BY-4.0" && (
                            <> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></>
                          )}
                          {d.raw_metadata_json?.license === "KOGL-Type-1" && " · KOGL Type 1"}
                          {" · headline shown unmodified"}
                        </p>
                      )}
                      <time
                        className="mt-2 block text-[10px] text-muted"
                        dateTime={d.published_at}
                      >
                        Published {formatTimestamp(d.published_at, timeZone)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
function Info({
  icon,
  title,
  text,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="panel block p-6 transition hover:border-accent"
    >
      <div className="mb-5 text-accent">{icon}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">
        Learn more <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}
