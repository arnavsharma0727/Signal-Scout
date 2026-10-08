import Link from "next/link";
import { serverSupabase } from "../../lib/server-supabase";
import { hasUnclearedHackerNewsEvidence } from "../../lib/source-policy";
import { getDisplayTimeZone } from "../../lib/display-timezone";
import { formatTimestamp } from "../../lib/format-time";
import { passesIndependentEvidenceGate, sourceOperatorsByLead, verifiedLeadEvidenceDocumentIds } from "../../lib/research-lead-qualification";
import { summarizeConversationCoverage, type ConversationCoverageRow } from "../../lib/research-conversation-coverage";
import { recentDiscussionObservations, recentDiscussionReportingOverlaps } from "../../lib/public-data";
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

export default async function Candidates({ searchParams }: { searchParams: Promise<{ published?: string; withdrawn?: string }> }) {
  const params = await searchParams;
  const timeZone = await getDisplayTimeZone();
  const db = serverSupabase();
  let leads: Lead[] = [];
  let unavailable = !db;
  let coverageUnavailable = !db;
  let coverageRows: ConversationCoverageRow[] = [];
  let coverageCapped = false;
  let sampleObservations: Awaited<ReturnType<typeof recentDiscussionObservations>> = null;
  let discussionReportingOverlaps: Awaited<ReturnType<typeof recentDiscussionReportingOverlaps>> = null;
  let discoveryUnavailable = !db;

  if (db) {
    [sampleObservations, discussionReportingOverlaps] = await Promise.all([
      recentDiscussionObservations(),
      recentDiscussionReportingOverlaps(),
    ]);
    discoveryUnavailable = sampleObservations === null || discussionReportingOverlaps === null;
    const coverageSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentConversationRows, error: coverageError, count: coverageCount } = await db
      .from("source_documents")
      .select("source_type,source_domain,raw_metadata_json", { count: "exact" })
      .in("source_type", ["licensed-forum", "stack-exchange"])
      .gte("published_at", coverageSince)
      .order("published_at", { ascending: false })
      .limit(1000);
    coverageUnavailable = Boolean(coverageError);
    coverageRows = (recentConversationRows ?? []) as ConversationCoverageRow[];
    coverageCapped = (coverageCount ?? coverageRows.length) > coverageRows.length;

    const { data, error } = await db
      .from("research_leads")
      .select("id,company_id,market_code,event_category,topic,status,first_detected_at,research_priority_score,independent_source_count,research_observation,research_starting_question,alternative_explanations_json,verified_evidence_json,companies(ticker,company_name_en)")
      .eq("status", "active")
      .order("research_priority_score", { ascending: false })
      .limit(50);
    unavailable = Boolean(error);
    const eligible = ((data ?? []) as unknown as Lead[]).filter((lead) =>
      verifiedLeadEvidenceDocumentIds(lead.verified_evidence_json) !== null && hasEvidence(lead.alternative_explanations_json));

    if (eligible.length && !error) {
      const { data: evidenceLinks, error: evidenceError } = await db
        .from("research_lead_documents")
        .select("research_lead_id,document_id,source_documents(source_type,source_domain,raw_metadata_json)")
        .in("research_lead_id", eligible.map(({ id }) => id));
      unavailable = Boolean(evidenceError);
      const links = evidenceLinks ?? [];
      const verifiedDocumentIdsByLead = new Map(eligible.map((lead) => [
        lead.id,
        verifiedLeadEvidenceDocumentIds(lead.verified_evidence_json)!,
      ]));
      const operatorsByLead = sourceOperatorsByLead(links, verifiedDocumentIdsByLead);
      const linkedDocumentIdsByLead = new Map<string, Set<string>>();
      for (const link of links) {
        if (!link.document_id) continue;
        const documentIds = linkedDocumentIdsByLead.get(link.research_lead_id) ?? new Set<string>();
        documentIds.add(link.document_id);
        linkedDocumentIdsByLead.set(link.research_lead_id, documentIds);
      }
      const linkedLeadIds = new Set(links.filter((link) =>
        link.document_id && !hasUnclearedHackerNewsEvidence([link.source_documents?.[0]?.source_type]))
        .map((link) => link.research_lead_id));
      const blockedLeadIds = new Set(links.filter((link) =>
        hasUnclearedHackerNewsEvidence([link.source_documents?.[0]?.source_type]))
        .map((link) => link.research_lead_id));
      leads = evidenceError ? [] : eligible.filter((lead) =>
        linkedLeadIds.has(lead.id) && !blockedLeadIds.has(lead.id) &&
        [...verifiedDocumentIdsByLead.get(lead.id)!].every((documentId) => linkedDocumentIdsByLead.get(lead.id)?.has(documentId)) &&
        passesIndependentEvidenceGate(lead, operatorsByLead.get(lead.id)));
    }
  }
  const conversationCoverage = summarizeConversationCoverage(coverageRows);

  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
      <main className="shell max-w-5xl py-10 md:py-14">
        <header className="max-w-3xl">
          <div className="eyebrow">Research review</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Evidence-qualified leads</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            A short queue of international research leads supported by linked source evidence. A topic is withheld unless its evidence, source operators, counter-evidence, and alternative explanations clear review.
          </p>
        </header>

        {params.published && <p role="status" className="mt-6 border-y border-line py-3 text-sm leading-6">
          {params.published === "duplicate" ? "An identical lead from this account is already in the public queue." : "Your researcher-reviewed lead was published to the shared queue."}
        </p>}
        {params.withdrawn && <p role={params.withdrawn === "1" ? "status" : "alert"} className="mt-6 border-y border-line py-3 text-sm leading-6">
          {params.withdrawn === "1" ? "Your lead was withdrawn from the public queue." : "That lead could not be withdrawn. Only its authenticated author can change its publication status."}
        </p>}

        <section className="mt-8 border-y border-line py-6" aria-live="polite">
          {unavailable ? (
            <>
              <h2 className="text-xl font-semibold">Lead review is temporarily unavailable.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">The lead database or linked evidence could not be read. No cached or synthetic result is shown.</p>
            </>
          ) : leads.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold">No evidence-qualified leads yet.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Current evidence does not meet the full review bar. Signal Scout will not convert a small or repetitive sample into a lead. Run a live, topic-specific search, inspect the original sources, record supporting and contradicting evidence, and state what would disconfirm the thesis.
              </p>
              <Link className="btn btn-primary mt-5" href="/">Start a research sweep</Link>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{leads.length} lead{leads.length === 1 ? "" : "s"} ready for review</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Research prompts, not recommendations. Every item links to its reviewed evidence and limitations.</p>
            </>
          )}
        </section>

        <section className="mt-7 border-b border-line pb-6" aria-labelledby="recent-discussion-coverage">
          <div className="eyebrow">Live source audit · last 24 hours</div>
          <h2 id="recent-discussion-coverage" className="mt-2 text-lg font-semibold">Licensed forum and Q&amp;A coverage</h2>
          {coverageUnavailable ? (
            <p className="mt-2 text-sm leading-6 text-muted">Recent discussion coverage could not be read. No source count is inferred.</p>
          ) : conversationCoverage.itemCount === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted">No scheduled licensed forum or Q&amp;A topic/question records fall in this 24-hour window. This does not mean no public conversation exists; use the live source sweep to search selected public sources.</p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-muted">
                {coverageCapped ? "At least " : ""}{conversationCoverage.itemCount.toLocaleString()} recent topic/question records from {conversationCoverage.operators.length} reviewed operator{conversationCoverage.operators.length === 1 ? "" : "s"}.
                {coverageCapped ? " The readout is capped at 1,000 records." : ""}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {conversationCoverage.operators.map((operator) => (
                  <li key={operator.key} className="flex items-baseline justify-between gap-4 border-y border-line py-2 text-sm">
                    <span>{operator.label}</span><span className="mono text-xs text-muted">{operator.itemCount.toLocaleString()} records</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-muted">
                {conversationCoverage.attributedItemCount.toLocaleString()} records have a displayed byline label across {conversationCoverage.distinctBylineLabels.toLocaleString()} labels; the largest repeated label group is {Math.round(conversationCoverage.largestBylineShare * 100)}% of attributed records.
                {conversationCoverage.unresolvedOperatorCount ? ` ${conversationCoverage.unresolvedOperatorCount} record(s) have unresolved operators and are not counted above.` : ""}
                {" "}These are capped provider records, not a measure of population attention, geographic reach, or market-wide conversation. Wikipedia revision metadata is excluded.
              </p>
            </>
          )}
        </section>

        <section className="mt-7 border-b border-line pb-7" aria-labelledby="automated-observations">
          <div className="eyebrow">Automatic discovery · source-level cues</div>
          <h2 id="automated-observations" className="mt-2 text-lg font-semibold">Patterns to investigate</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            These are reproducible observations from stored, reviewed records—not qualified leads. Tag-share prompts compare Stack Exchange questions with that platform’s observed baseline; phrase overlaps are literal same-language matches between discussion titles and licensed reporting headlines. Neither establishes public attention, sentiment, causality, or market impact.
          </p>
          {discoveryUnavailable ? (
            <p className="mt-4 text-sm text-muted">Automatic observations are unavailable because the source records could not be read. No inference is substituted.</p>
          ) : (() => {
            const tagPrompts = (sampleObservations ?? []).filter((row) => row.sampleReviewCandidate);
            const overlaps = (discussionReportingOverlaps ?? []).slice(0, 6);
            if (!tagPrompts.length && !overlaps.length) return (
              <p className="mt-4 text-sm text-muted">No reproducible patterns cleared the current source-level checks. This may reflect sparse coverage or the narrowness of the collected sources; it is not evidence that no conversation is changing.</p>
            );
            return <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Observed Q&amp;A tag-share prompts</h3>
                {tagPrompts.length ? <ul className="mt-3 space-y-3">{tagPrompts.map((row) => (
                  <li key={row.tag} className="border-t border-line pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link className="font-medium underline underline-offset-4" href={`/explore#${new URLSearchParams({ topic: row.tag }).toString()}`}>{row.tag}</Link>
                      <span className="mono text-xs text-muted">{row.recentQuestionCount} / {row.recentSampleSize} recent questions</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">{row.sampleReviewReason} Baseline: {row.priorObservedDays} prior observed days; one Q&amp;A operator.</p>
                    <ul className="mt-2 space-y-1 text-xs">{row.evidence.map((item) => <li key={item.id}><a className="underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><span className="text-muted"> · {item.community}</span></li>)}</ul>
                  </li>
                ))}</ul> : <p className="mt-3 text-xs leading-5 text-muted">No tag-share prompt cleared the current minimums. A usable baseline requires at least 14 prior observed days and adequate recent sample volume.</p>}
              </div>
              <div>
                <h3 className="text-sm font-semibold">Literal discussion–reporting overlaps</h3>
                {overlaps.length ? <ul className="mt-3 space-y-3">{overlaps.map((row) => (
                  <li key={`${row.language}:${row.matchBasis}:${row.phrase}`} className="border-t border-line pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{row.phrase}</span><span className="mono text-xs text-muted">{row.language} · {row.matchBasis}</span></div>
                    <p className="mt-1 text-xs text-muted">{row.discussionItemCount} discussion item(s); reporting labels: {row.reportingPublishers.join(", ") || "not resolved"}. Lexical match only.</p>
                    <ul className="mt-2 space-y-1 text-xs">{[...row.discussions, ...row.reporting].slice(0, 4).map((item) => <li key={item.id}><a className="underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a><span className="text-muted"> · {item.source}</span></li>)}</ul>
                  </li>
                ))}</ul> : <p className="mt-3 text-xs leading-5 text-muted">No exact phrase appeared in both eligible discussion titles and same-language licensed headlines in the last seven days.</p>}
              </div>
            </div>;
          })()}
        </section>

        {leads.length > 0 && (
          <div className="mt-6 space-y-4">
            {leads.map((lead) => (
              <article className="panel p-5 md:p-6" key={lead.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="eyebrow">
                    {lead.market_code ?? "International"}
                    {lead.event_category ? ` · ${lead.event_category}` : ""}
                    {lead.first_detected_at ? ` · ${formatTimestamp(lead.first_detected_at, timeZone)}` : ""}
                  </div>
                  <span className="mono text-xs text-muted">{lead.independent_source_count ?? 0} reviewed source operators</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{lead.topic || lead.companies?.company_name_en || "Research lead"}</h2>
                {lead.companies && <p className="mt-1 text-sm text-muted">{lead.companies.ticker} · {lead.companies.company_name_en}</p>}
                {lead.research_observation && <p className="mt-4 max-w-3xl text-sm leading-6">{lead.research_observation}</p>}
                {lead.research_starting_question && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted"><strong className="text-ink">Research question:</strong> {lead.research_starting_question}</p>}
                <Link className="btn mt-5" href={`/divergences/${encodeURIComponent(lead.id)}`}>Inspect evidence and limitations</Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function hasEvidence(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" && value.trim().length > 0;
}
