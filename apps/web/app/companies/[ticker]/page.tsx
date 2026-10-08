import Link from "next/link";
import { notFound } from "next/navigation";
import { serverSupabase } from "../../../lib/server-supabase";
import { isPublicEvidenceEligible } from "../../../lib/source-policy";
import { getDisplayTimeZone } from "../../../lib/display-timezone";
import { formatTimestamp } from "../../../lib/format-time";

export const dynamic = "force-dynamic";

type Document = {
  id: string;
  market_code: string | null;
  source_type: string;
  source_name: string | null;
  source_domain: string | null;
  language_code: string | null;
  title_original: string | null;
  excerpt_original: string | null;
  source_url: string | null;
  published_at: string | null;
};

export default async function CompanyResearch({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const timeZone = await getDisplayTimeZone();
  const { ticker } = await params;
  const db = serverSupabase();
  if (!db)
    return (
      <Shell>
        <div className="panel p-7">
          <h1 className="text-2xl font-semibold">Research data unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The database is not configured. No profile or evidence is
            substituted.
          </p>
        </div>
      </Shell>
    );
  const { data: company, error } = await db
    .from("companies")
    .select(
      "id,ticker,company_name_en,name_ko,krx_code,exchange,description,aliases_en_json,aliases_ko_json,topics_of_interest_json",
    )
    .eq("ticker", ticker)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !company) notFound();
  const [
    { data: markets },
    { data: relatedRows },
    { data: rawDocuments, error: documentsError },
  ] = await Promise.all([
    db
      .from("company_market_profiles")
      .select("market_code,language_code")
      .eq("company_id", company.id)
      .eq("enabled", true),
    db
      .from("entity_links")
      .select(
        "relationship_type,target_company_id,companies!entity_links_target_company_id_fkey(ticker,company_name_en)",
      )
      .eq("source_company_id", company.id),
    db
      .from("source_documents")
      .select(
        "id,market_code,source_type,source_name,source_domain,language_code,title_original,excerpt_original,source_url,published_at",
      )
      .eq("company_id", company.id)
      .neq("source_type", "hacker-news")
      .neq("source_domain", "news.google.com")
      .order("published_at", { ascending: false })
      .limit(40),
  ]);
  const documents = ((rawDocuments ?? []) as Document[]).filter(
    (doc) =>
      doc.source_url &&
      doc.title_original &&
      isPublicEvidenceEligible(doc.source_type, doc.source_domain),
  );
  const relationships = relatedRows ?? [];
  const byMarket = (code: string) =>
    documents.filter((doc) => doc.market_code === code);
  return (
    <Shell>
      <div className="eyebrow">
        {company.exchange} · {company.ticker}
        {company.krx_code ? ` · KRX ${company.krx_code}` : ""}
      </div>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
        {company.company_name_en}
      </h1>
      {company.name_ko && (
        <p className="mt-2 text-lg text-muted" lang="ko">
          {company.name_ko}
        </p>
      )}
      <p className="mt-4 max-w-3xl leading-7 text-muted">
        {company.description}
      </p>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted">
        Enabled profile coverage:{" "}
        {(markets ?? [])
          .map((m) => `${m.market_code} · ${m.language_code}`)
          .join(" / ") || "none"}
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Tracked topics</h2>
          {(company.topics_of_interest_json ?? []).length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {(company.topics_of_interest_json ?? []).map((topic: string) => (
                <li
                  className="rounded border border-line px-2 py-1 text-xs"
                  key={topic}
                >
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No topic taxonomy configured.
            </p>
          )}
          <h3 className="mt-5 text-sm font-semibold">Aliases</h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            English: {(company.aliases_en_json ?? []).join(" · ") || "None"}
            <br />
            Korean: {(company.aliases_ko_json ?? []).join(" · ") || "None"}
          </p>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Related entities</h2>
          {relationships.length ? (
            <ul className="mt-3 space-y-2">
              {relationships.map((item: any) => (
                <li
                  className="text-sm"
                  key={`${item.target_company_id}-${item.relationship_type}`}
                >
                  <Link
                    className="underline underline-offset-4"
                    href={`/companies/${encodeURIComponent(item.companies?.ticker ?? "")}`}
                  >
                    {item.companies?.company_name_en ?? "Entity"}
                  </Link>
                  <span className="text-muted">
                    {" "}
                    · {item.relationship_type}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No reviewed relationship is recorded.
            </p>
          )}
        </section>
      </div>
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="eyebrow">Original source records</div>
            <h2 className="mt-2 text-2xl font-semibold">Evidence by market</h2>
          </div>
          <p className="text-xs text-muted">
            {documents.length} eligible records shown · maximum 40
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          These are records linked to this profile, not an estimate of investor
          attention. Hacker News records remain withheld during source-rights
          review; Google News redirect rows are excluded. Headlines remain
          untranslated.
        </p>
        {documentsError ? (
          <div className="panel mt-4 p-6">
            <p className="text-sm">Source records could not be loaded.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {["KR", "US"].map((code) => (
              <section className="panel overflow-hidden" key={code}>
                <div className="border-b border-line p-5">
                  <div className="eyebrow">
                    {code === "KR" ? "South Korea" : "United States"}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {byMarket(code).length} linked records
                  </p>
                </div>
                {byMarket(code).length ? (
                  <ul className="divide-y divide-line">
                    {byMarket(code).map((doc) => (
                      <li className="p-5" key={doc.id}>
                        <div className="flex justify-between gap-3 text-[10px] uppercase tracking-wider text-muted">
                          <span>
                            {doc.source_name ?? doc.source_type}
                            {doc.source_domain ? ` · ${doc.source_domain}` : ""}
                          </span>
                          <span>{doc.language_code ?? "language unknown"}</span>
                        </div>
                        <a
                          className="mt-2 block text-sm font-semibold leading-6 underline decoration-line underline-offset-4"
                          href={doc.source_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {doc.title_original}
                        </a>
                        {doc.excerpt_original && (
                          <p className="mt-2 text-xs leading-5 text-muted">
                            {doc.excerpt_original}
                          </p>
                        )}
                        <time className="mt-3 block text-[10px] text-muted">
                          Published {formatTimestamp(doc.published_at, timeZone)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-5 text-sm leading-6 text-muted">
                    No eligible linked source records. This is an evidence gap,
                    not evidence that conversation is absent.
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
      <Link className="btn mt-8" href="/companies">
        ← All research profiles
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          ATLAS
        </Link>
        <Link href="/companies" className="text-sm text-muted">
          ← Research profiles
        </Link>
      </header>
      <main className="shell py-14">{children}</main>
    </div>
  );
}
