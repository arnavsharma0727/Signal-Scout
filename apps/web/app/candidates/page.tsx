import Link from "next/link";
import { serverSupabase } from "../../lib/server-supabase";
import { hasUnclearedHackerNewsEvidence } from "../../lib/source-policy";
import { getDisplayTimeZone } from "../../lib/display-timezone";
import { formatTimestamp } from "../../lib/format-time";
import { recentDiscussionObservations, recentDiscussionReportingOverlaps } from "../../lib/public-data";
import { passesIndependentEvidenceGate, sourceOperatorsByLead } from "../../lib/research-lead-qualification";
import SiteHeader from "../../components/site-header";

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
  const discussionResult = await recentDiscussionObservations();
  const observationsUnavailable = discussionResult === null;
  const observations = discussionResult ?? [];
  const overlapResult = await recentDiscussionReportingOverlaps();
  const overlapsUnavailable = overlapResult === null;
  const overlaps = overlapResult ?? [];
  const repeatedOverlaps = overlaps.filter((overlap) => overlap.discussionItemCount >= 3);
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
        .select("research_lead_id,document_id,source_documents(source_type,source_domain,raw_metadata_json)")
        .in(
          "research_lead_id",
          qualified.map((lead) => lead.id),
        );
      if (evidenceError) unavailable = true;
      const links = evidenceLinks ?? [];
      const operatorsByLead = sourceOperatorsByLead(links);
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
              linkedLeadIds.has(lead.id) && !blockedLeadIds.has(lead.id) &&
              passesIndependentEvidenceGate(lead, operatorsByLead.get(lead.id)),
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
          Exact tags on licensed Stack Exchange questions published in the last
          72 hours, compared with their median daily share across prior observed
          publication days in the 30-day, one-page-per-query archive. The daily
          connector re-queries that bounded window; up to 100 results per query
          may omit additional matches. Days with no eligible records are not
          treated as zero. A baseline stays unavailable until 14 observed days
          exist. This is a query-selected expert Q&amp;A sample from one
          platform—not a population trend or independent-source count.
          Tags remain in their original form; no translation or semantic merge
          is inferred. Open the source questions before drawing conclusions.
          A sample-level review flag requires at least 3 tagged questions among
          20 recent questions, 2 Stack Exchange communities, 14 prior observed
          days, and a share increase of at least max(3×MAD, 15 percentage
          points). It is an exploratory triage rule—not significance, a public
          attention measure, or an evidence-qualified thesis lead.
        </p>
        {observationsUnavailable ? (
          <p className="mt-4 text-sm text-muted">
            Discussion topic data is unavailable right now. This is not evidence
            that a topic or discussion is absent.
          </p>
        ) : observations.length ? (
          <div className="mt-5 space-y-4">
            {observations.map((observation) => (
              <article className="border-t border-line pt-4" key={observation.tag}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{observation.tag}</h3>
                  <span className="mono text-xs text-muted">
                    {observation.recentSampleSize < 20
                      ? `${observation.recentQuestionCount} tagged · ${observation.recentSampleSize}/20 minimum sample`
                      : `${observation.recentQuestionCount} of ${observation.recentSampleSize} sampled · ${Math.round(observation.recentShare * 100)}% recent share`}
                    {" · "}
                    {observation.communities.length}{" "}
                    {observation.communities.length === 1 ? "community" : "communities"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {observation.baselineStatus === "available"
                    ? `Prior daily median ${formatShare(observation.baselineMedianDailyShare)} · MAD ${formatShare(observation.baselineMadDailyShare)} · ${observation.priorObservedDays} observed publication days`
                    : `Baseline unavailable · ${observation.priorObservedDays}/14 prior observed publication days`}
                </p>
                {observation.sampleReviewCandidate && observation.sampleReviewReason && (
                  <p className="mt-3 border-l-2 border-ink pl-3 text-sm leading-6">
                    <strong>Sample-level review flag—not a thesis lead.</strong>{" "}
                    {observation.sampleReviewReason} This is one expert-Q&amp;A platform; corroborate the topic with independent reporting and other conversation before forming a thesis.
                  </p>
                )}
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
                <Link
                  className="btn mt-4"
                  href={`/explore#topic=${encodeURIComponent(observation.tag)}`}
                >
                  Investigate this topic in Explore
                </Link>
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
      <section className="panel mb-6 p-6" aria-labelledby="discussion-reporting-overlaps-title">
        <h2 id="discussion-reporting-overlaps-title" className="text-xl font-semibold">
          Discussion–reporting phrase overlaps
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A phrase can be a community-applied Stack Exchange tag, a scheduled Stack Exchange search term, or an exact two-to-four-word sequence from a Fedora topic title. It must appear as a whole phrase in a same-language licensed headline from the last seven days; scheduled search terms must also appear in the question title. Only phrases repeated across at least three distinct discussion records are shown; isolated title collisions are withheld. Generated Fedora phrases are literal title excerpts, not platform tags or classified topics. Search-term matches reflect collector design, not organic topic frequency. Common English function-word phrases and acronym-only Latin phrases of two or three letters (such as AI, GPU, or LLM) are suppressed to reduce generic collisions; this heuristic can also omit relevant phrases. Fedora is a selected Linux community, not a financial forum or population sample. This query-selected sample is not evidence that discussion caused coverage, that sources are independent, or that either reflects public attention. No translation, sentiment, market impact, or thesis is inferred. Open every original item.
        </p>
        {overlapsUnavailable ? (
          <p className="mt-4 text-sm text-muted">Cross-source records are unavailable. This is not evidence that no related discussion or reporting exists.</p>
        ) : repeatedOverlaps.length ? (
          <div className="mt-5 space-y-5">
            {repeatedOverlaps.map((overlap) => (
              <article className="border-t border-line pt-4" key={`${overlap.language}:${overlap.matchBasis}:${overlap.phrase}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{overlap.phrase}</h3>
                  <span className="mono text-xs text-muted">{overlap.language} · {overlap.discussionItemCount} matching discussion items · {overlap.reporting.length} linked headlines shown</span>
                </div>
                <p className="mt-1 text-xs text-muted">Match basis: {overlap.matchBasis}{overlap.matchBasis === "scheduled search phrase" ? " · collector-selected, not an organic topic label" : overlap.matchBasis === "community tag" ? " · source-applied topic label" : " · exact phrase excerpted from the original forum title, not a platform tag"}</p>
                <p className="mt-1 text-xs text-muted">Discussion sources: {overlap.discussionSources.join(" · ") || "not reported"}</p>
                <p className="mt-1 text-xs text-muted">Publisher labels in feed metadata: {overlap.reportingPublishers.join(" · ") || "not reported"} · Feed editions represented: {overlap.reportingSources.join(" · ") || "not reported"}. Publisher labels are not proof of corporate independence.</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Discussion · original titles</h4>
                    <ul className="mt-2 space-y-2">
                      {overlap.discussions.map((item) => <li key={item.id} className="text-sm leading-5"><a className="underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><div className="text-xs text-muted">{item.source} · {formatTimestamp(item.publishedAt, timeZone)}</div></li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Reporting/analysis · headlines</h4>
                    <ul className="mt-2 space-y-2">
                      {overlap.reporting.map((item) => <li key={item.id} className="text-sm leading-5"><a className="underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><div className="text-xs text-muted">{item.source} · {formatTimestamp(item.publishedAt, timeZone)}</div></li>)}
                    </ul>
                  </div>
                </div>
                <Link className="btn mt-4" href={`/explore#topic=${encodeURIComponent(overlap.phrase)}`}>
                  Explore this phrase across live sources
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">{overlaps.length ? "No phrase matched across at least three distinct discussion records; isolated title collisions are withheld. Even repeated overlaps are only prompts to inspect the original evidence, not leads." : "No exact same-language tag or collection-term/headline matches were found in the available seven-day sample. This does not mean the topic is absent from discussion or reporting."}</p>
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
            alternative explanations, a recorded independent-source count of
            at least two, and linked records that resolve to at least two
            reviewed source operators. Unknown publishers and collection-index
            domains do not count. Current samples do not support an
            evidence-qualified international research lead.
          </p>
          <Link className="btn mt-6" href="/">
            Review collected source evidence
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">
            Research prompts for human review, not recommendations. Items
            without verified evidence, alternative explanations, linked source
            records, or two independently reviewed source operators are
            excluded.
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
function formatShare(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
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
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
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
