import Link from "next/link";
import { notFound } from "next/navigation";
import { serverSupabase } from "../../../lib/server-supabase";
import { hasUnclearedHackerNewsEvidence } from "../../../lib/source-policy";
import { getDisplayTimeZone } from "../../../lib/display-timezone";
import { formatTimestamp } from "../../../lib/format-time";

export const dynamic = "force-dynamic";

type Evidence = {
  id: string;
  title_original: string | null;
  excerpt_original: string | null;
  source_url: string | null;
  source_name: string | null;
  source_domain: string | null;
  market_code: string | null;
  source_type: string | null;
  published_at: string | null;
};
type LinkRow = {
  relationship_type: string | null;
  source_documents: Evidence | null;
};
type Lead = {
  id: string;
  company_id: string | null;
  market_code: string | null;
  event_category: string | null;
  topic: string | null;
  status: string;
  first_detected_at: string | null;
  research_observation: string | null;
  research_starting_question: string | null;
  potential_business_relevance: string | null;
  alternative_explanations_json: unknown;
  validation_steps_json: unknown;
  verified_evidence_json: unknown;
  companies: { ticker: string; company_name_en: string } | null;
};

export default async function DivergenceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const timeZone = await getDisplayTimeZone();
  const { id } = await params;
  const db = serverSupabase();
  if (!db) return <Unavailable />;
  const { data, error } = await db
    .from("research_leads")
    .select(
      "id,company_id,market_code,event_category,topic,status,first_detected_at,research_observation,research_starting_question,potential_business_relevance,alternative_explanations_json,validation_steps_json,verified_evidence_json,companies(ticker,company_name_en)",
    )
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (error) return <Unavailable />;
  if (
    !data ||
    !hasEvidence(data.verified_evidence_json) ||
    !hasEvidence(data.alternative_explanations_json)
  )
    notFound();
  const lead = data as unknown as Lead;
  const { data: linkedData, error: linkedError } = await db
    .from("research_lead_documents")
    .select(
      "relationship_type,source_documents!inner(id,title_original,excerpt_original,source_url,source_name,source_domain,market_code,source_type,published_at)",
    )
    .eq("research_lead_id", id);
  if (linkedError) return <Unavailable />;
  const links = (linkedData ?? []) as unknown as LinkRow[];
  if (
    hasUnclearedHackerNewsEvidence(
      links.map((row) => row.source_documents?.source_type),
    )
  )
    notFound();
  const supporting = links.filter(
    (row) => !isCounter(row.relationship_type) && row.source_documents,
  );
  const counter = links.filter(
    (row) => isCounter(row.relationship_type) && row.source_documents,
  );
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/candidates" className="text-sm text-muted">
          ← Lead review
        </Link>
      </header>
      <main className="shell py-14">
        <div className="eyebrow mb-4">
          Evidence-linked research prompt ·{" "}
          {lead.market_code ?? "Market not specified"}
          {lead.event_category ? ` · ${lead.event_category}` : ""}
        </div>
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight">
          {lead.topic || lead.companies?.company_name_en || "Research lead"}
        </h1>
        {lead.companies && (
          <p className="mt-3 text-sm text-muted">
            {lead.companies.ticker} · {lead.companies.company_name_en}
          </p>
        )}
        {lead.first_detected_at && (
          <time
            className="mt-2 block text-xs text-muted"
            dateTime={lead.first_detected_at}
          >
            First recorded {formatTimestamp(lead.first_detected_at, timeZone)}
          </time>
        )}
        <section className="panel mt-7 p-6">
          <div className="eyebrow">Observation</div>
          <p className="mt-3 leading-7">
            {lead.research_observation || "No narrative observation supplied."}
          </p>
          {lead.research_starting_question && (
            <p className="mt-4 text-sm leading-6 text-muted">
              <strong className="text-ink">Research question:</strong>{" "}
              {lead.research_starting_question}
            </p>
          )}
          {lead.potential_business_relevance && (
            <p className="mt-4 text-sm leading-6 text-muted">
              <strong className="text-ink">
                Potential relevance to investigate:
              </strong>{" "}
              {lead.potential_business_relevance}
            </p>
          )}
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <EvidenceSection
            title="Supporting source evidence"
            rows={supporting}
            timeZone={timeZone}
          />
          <EvidenceSection title="Counter-evidence" rows={counter} timeZone={timeZone} />
        </div>
        <section className="panel mt-5 p-6">
          <div className="eyebrow">Alternative explanations</div>
          <ListValue value={lead.alternative_explanations_json} />
          <div className="eyebrow mt-7">Validation steps</div>
          <ListValue value={lead.validation_steps_json} />
        </section>
        <p className="mt-5 text-xs leading-5 text-muted">
          Original source context is authoritative. Translation is not shown
          unless a permitted, labeled translation exists. This is a research
          prompt, not financial advice or a buy/sell recommendation.
        </p>
      </main>
    </div>
  );
}

function EvidenceSection({ title, rows, timeZone }: { title: string; rows: LinkRow[]; timeZone: import("../../../lib/time-zones").DisplayTimeZone }) {
  return (
    <section className="panel p-6">
      <div className="eyebrow">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          No linked source records.
        </p>
      ) : (
        <ul className="mt-4 space-y-5">
          {rows.map((row, index) => {
            const doc = row.source_documents!;
            return (
              <li
                className="border-t border-line pt-4"
                key={`${doc.id}-${index}`}
              >
                <div className="flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wider text-muted">
                  <span>{doc.market_code ?? "Market unknown"}</span>
                  <span>{doc.source_type ?? "Source type unknown"}</span>
                  <span>
                    {doc.source_domain ?? doc.source_name ?? "Source unknown"}
                  </span>
                </div>
                {doc.source_url ? (
                  <a
                    className="mt-2 block text-sm font-semibold underline underline-offset-4"
                    href={doc.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {doc.title_original || "Open original source"}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-semibold">
                    {doc.title_original || "Untitled source"}
                  </p>
                )}
                {doc.excerpt_original && (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {doc.excerpt_original}
                  </p>
                )}
                {doc.published_at && (
                  <time
                    className="mt-2 block text-[10px] text-muted"
                    dateTime={doc.published_at}
                  >
                    Published {formatTimestamp(doc.published_at, timeZone)}
                  </time>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
function ListValue({ value }: { value: unknown }) {
  const items = Array.isArray(value)
    ? value
    : Object.values(
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {},
      );
  return items.length ? (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
      {items.map((item, index) => (
        <li key={index}>
          {typeof item === "string" ? item : JSON.stringify(item)}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-3 text-sm text-muted">Not recorded.</p>
  );
}
function isCounter(value: string | null) {
  return Boolean(value && /(counter|disconfirm|contradict)/i.test(value));
}
function hasEvidence(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" && value.trim().length > 0;
}
function Unavailable() {
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/candidates" className="text-sm text-muted">
          ← Lead review
        </Link>
      </header>
      <main className="shell py-16">
        <div className="panel max-w-2xl p-8">
          <h1 className="text-2xl font-bold">Lead evidence is unavailable.</h1>
          <p className="mt-3 leading-7 text-muted">
            The lead schema could not be read. No substitute data is displayed.
          </p>
        </div>
      </main>
    </div>
  );
}
