import Link from "next/link";
import { serverSupabase } from "../../lib/server-supabase";
import { hasUnclearedHackerNewsEvidence } from "../../lib/source-policy";
import { getDisplayTimeZone } from "../../lib/display-timezone";
import { formatTimestamp } from "../../lib/format-time";
import { recentDiscussionObservations } from "../../lib/public-data";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  company_id: string | null;
  market_code: string | null;
  event_category: string | null;
  topic: string | null;
  status: string;
  first_detected_at: string | null;
  research_priority_score: number | null;
  independent_source_count: number | null;
  research_observation: string | null;
  research_starting_question: string | null;
  alternative_explanations_json: unknown;
  verified_evidence_json: unknown;
  companies: { ticker: string; company_name_en: string } | null;
};

export default async function Candidates() {
  const timeZone = await getDisplayTimeZone();
  const observations = await recentDiscussionObservations();
  const db = serverSupabase();
  let leads: Lead[] = [];
  let unavailable = !db;
  if (db) {
    const { data, error } = await db
      .from("research_leads")
      .select(
        "id,company_id,market_code,event_category,topic,status,first_detected_at,research_priority_score,independent_source_count,research_observation,research_starting_question,alternative_explanations_json,verified_evidence_json,companies(ticker,company_name_en)",
      )
      .eq("status", "active")
      .order("research_priority_score", { ascending: false })
      .limit(50);
    unavailable = Boolean(error);
    const qualified = ((data ?? []) as unknown as Lead[]).filter(
      (lead) =>
        hasEvidence(lead.verified_evidence_json) &&
        hasEvidence(lead.alternative_explanations_json),
    );
    if (qualified.length) {
      const { data: evidenceLinks, error: evidenceError } = await db
        .from("research_lead_documents")
        .select("research_lead_id,document_id,source_documents(source_type)")
        .in(
          "research_lead_id",
          qualified.map((lead) => lead.id),
        );
      if (evidenceError) unavailable = true;
      const links = evidenceLinks ?? [];
      const linkedLeadIds = new Set(
        links
          .filter(
            (link) =>
              link.document_id &&
              !hasUnclearedHackerNewsEvidence([
                link.source_documents?.[0]?.source_type,
              ]),
          )
          .map((link) => link.research_lead_id),
      );
      const blockedLeadIds = new Set(
        links
          .filter((link) =>
            hasUnclearedHackerNewsEvidence([
              link.source_documents?.[0]?.source_type,
            ]),
          )
          .map((link) => link.research_lead_id),
      );
      leads = evidenceError
        ? []
        : qualified.filter(
            (lead) =>
              linkedLeadIds.has(lead.id) && !blockedLeadIds.has(lead.id),
          );
    }
  }
  return (
    <Page title="Lead review" eyebrow="Research queue">
      <section className="panel mb-6 p-6" aria-labelledby="discussion-observations-title">
        <h2 id="discussion-observations-title" className="text-xl font-semibold">
          Observed discussion topics
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Exact tags on licensed Stack Exchange questions collected in the last
          72 hours. This is a query-selected expert Q&amp;A sample from
          one platform—not a population trend or a count of independent outlets.
          Tags remain in their original form; no translation or semantic merge
          is inferred. Open the source questions before deciding whether a topic
          merits further research.
        </p>
        {observations.length ? (
          <div className="mt-5 space-y-4">
            {observations.map((observation) => (
              <article className="border-t border-line pt-4" key={observation.tag}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{observation.tag}</h3>
                  <span className="mono text-xs text-muted">
                    {observation.questionCount}{" "}
                    {observation.questionCount === 1 ? "question" : "questions"}
                    {" · "}
                    {observation.communities.length}{" "}
                    {observation.communities.length === 1 ? "community" : "communities"}
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {observation.evidence.map((item) => (
                    <li key={item.id} className="text-sm leading-6">
                      <a className="underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                      <span className="ml-2 text-xs text-muted">
                        {item.community}
                        {item.publishedAt ? ` · ${formatTimestamp(item.publishedAt, timeZone)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No eligible tagged questions were collected in this window. That
            describes this narrow sample only; it does not mean discussion is
            absent elsewhere.
          </p>
        )}
      </section>
      {unavailable ? (
        <div className="panel p-8">
          <h2 className="text-xl font-semibold">Lead data is not available.</h2>
          <p className="mt-3 max-w-xl leading-7 text-muted">
            The database is not configured or its lead schema could not be read.
            The page will not substitute synthetic or partial leads.
          </p>
        </div>
      ) : leads.length === 0 ? (
        <div className="panel p-8">
          <h2 className="text-xl font-semibold">
            No evidence-qualified leads yet.
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-muted">
            A lead appears only after the database contains verified evidence,
            alternative explanations, and at least one linked source record.
            Current samples do not support an evidence-qualified international
            research lead.
          </p>
          <Link className="btn mt-6" href="/">
            Review collected source evidence
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">
            Research prompts for human review, not recommendations. Items
            without verified evidence, alternative explanations, or linked
            source records are excluded.
          </p>
          <div className="space-y-4">
            {leads.map((lead) => (
              <article className="panel p-6" key={lead.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="eyebrow">
                    {lead.market_code ?? "Market not specified"}
                    {lead.event_category ? ` · ${lead.event_category}` : ""}
                    {lead.first_detected_at
                      ? ` · ${formatTimestamp(lead.first_detected_at, timeZone)}`
                      : ""}
                  </div>
                  <span className="mono text-xs text-muted">
                    {lead.independent_source_count ?? 0} independent sources
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">
                  {lead.topic ||
                    lead.companies?.company_name_en ||
                    "Research lead"}
                </h2>
                {lead.companies && (
                  <p className="mt-1 text-sm text-muted">
                    {lead.companies.ticker} · {lead.companies.company_name_en}
                  </p>
                )}
                {lead.research_observation && (
                  <p className="mt-4 max-w-3xl text-sm leading-6">
                    {lead.research_observation}
                  </p>
                )}
                {lead.research_starting_question && (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    <strong className="text-ink">Question:</strong>{" "}
                    {lead.research_starting_question}
                  </p>
                )}
                <Link
                  className="btn mt-5"
                  href={`/divergences/${encodeURIComponent(lead.id)}`}
                >
                  Inspect evidence
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

function hasEvidence(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" && value.trim().length > 0;
}
function Page({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/" className="text-sm text-muted">
          ← Briefing
        </Link>
      </header>
      <main className="shell py-16">
        <div className="eyebrow mb-4">{eyebrow}</div>
        <h1 className="mb-10 text-4xl font-extrabold tracking-tight">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
