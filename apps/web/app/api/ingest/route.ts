import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/server-supabase";
import { GDELTConnector } from "../../../lib/connectors/gdelt";
import { RSSConnector } from "../../../lib/connectors/rss";
import { BlueskyConnector } from "../../../lib/connectors/bluesky";
import { HackerNewsConnector } from "../../../lib/connectors/hackernews";
import { SECEdgarConnector } from "../../../lib/connectors/sec";
import { MOISPressReleaseConnector } from "../../../lib/connectors/mois";
import { StackExchangeConnector } from "../../../lib/connectors/stackexchange";
import { EuropeanCommissionConnector } from "../../../lib/connectors/european-commission";
import { safeConnectorError } from "../../../lib/connectors/fetch";
import { matchEntityText } from "../../../lib/entity-matching";
import { recomputeEntityDailyMetrics } from "../../../lib/recompute-metrics";
import { isHackerNewsIngestionEnabled } from "../../../lib/source-policy";
import { excludeTakedownBlockedDocuments } from "../../../lib/source-takedown";
import type {
  Connector,
  NormalizedDocument,
} from "../../../lib/connectors/types";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runIngestion();
}
export async function POST(request: NextRequest) {
  if (!isAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runIngestion();
}
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}
async function runIngestion() {
  const db = serverSupabase();
  if (!db)
    return NextResponse.json(
      { error: "Supabase server configuration is missing" },
      { status: 503 },
    );
  const start = new Date(Date.now() - 72 * 60 * 60 * 1000),
    end = new Date();
  const { data: companies, error: companyError } = await db
    .from("companies")
    .select("id,ticker,cik,is_active")
    .eq("is_active", true);
  if (companyError)
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  const connectors: Connector[] = [];
  if (process.env.BLUESKY_ENABLED === "true")
    connectors.push(new BlueskyConnector());
  if (isHackerNewsIngestionEnabled())
    connectors.push(new HackerNewsConnector());
  if (process.env.SEC_USER_AGENT) connectors.push(new SECEdgarConnector());
  const summary = {
    companies: companies?.length ?? 0,
    documentsStored: 0,
    runs: 0,
    metricsWritten: 0,
    errors: [] as string[],
  };
  for (const company of companies ?? []) {
    const { data: markets } = await db
      .from("company_market_profiles")
      .select("*")
      .eq("company_id", company.id)
      .eq("enabled", true);
    for (const market of markets ?? []) {
      const marketConnectors = [...connectors];
      if (
        process.env.STACK_EXCHANGE_ENABLED === "true" &&
        company.ticker === "MARKET-TALK" &&
        market.market_code === "US"
      )
        marketConnectors.push(new StackExchangeConnector());
      // GDELT is a global news index. Run one global query per scheduled
      // ingestion rather than multiplying requests across profiles/markets.
      if (
        process.env.GDELT_ENABLED === "true" &&
        company.ticker === "MARKET-TALK" &&
        market.market_code === "US"
      )
        marketConnectors.push(new GDELTConnector());
      if (
        process.env.MOIS_PRESS_RELEASES_ENABLED === "true" &&
        company.ticker === "MARKET-TALK" &&
        market.market_code === "KR"
      )
        marketConnectors.push(new MOISPressReleaseConnector());
      if (
        company.ticker === "MARKET-TALK" &&
        market.market_code === "US"
      )
        marketConnectors.push(new EuropeanCommissionConnector());
      const rssFeeds = getRssFeeds(market.market_code);
      if (process.env.RSS_ENABLED === "true" && rssFeeds.length)
        marketConnectors.push(new RSSConnector(rssFeeds));
      const aliases = [
        ...(market.company_aliases_json ?? []),
        ...(market.products_games_apps_brands_json ?? []),
      ]
        .filter(Boolean)
        .slice(0, 12);
      const query = aliases.join(" OR ");
      for (const connector of marketConnectors) {
        const started = new Date();
        try {
          let result;
          if (connector instanceof SECEdgarConnector) {
            if (!company.cik) continue;
            result = await connector.fetchCompanyFilings(
              company.cik,
              company.id,
              start,
              end,
            );
          } else if (connector instanceof MOISPressReleaseConnector)
            result = await connector.fetchDocuments({
              query: "반도체 OR 경제 OR 수출 OR 금융 OR 미국 OR 무역",
              start,
              end,
              marketCode: "KR",
              languageCode: "ko",
            });
          else if (connector instanceof EuropeanCommissionConnector)
            result = await connector.fetchDocuments({
              query: "official Commission releases",
              start,
              end,
              marketCode: "INTL",
              languageCode: "en",
            });
          else if (connector instanceof StackExchangeConnector)
            result = await connector.fetchDocuments({
              query,
              start,
              end,
              languageCode: "en",
            });
          else if (connector instanceof GDELTConnector)
            result = await connector.fetchDocuments({ query, start, end });
          else
            result = await connector.fetchDocuments({
              query,
              start,
              end,
              marketCode: market.market_code,
              languageCode: market.language_code,
              companyId:
                company.ticker === "MARKET-TALK" ? undefined : company.id,
            });
          const macroContext = company.ticker === "MARKET-TALK";
          const matches = macroContext
            ? []
            : result.documents
                .map((document) => ({
                  document,
                  match: matchEntityText(
                    `${document.titleOriginal} ${document.excerptOriginal ?? ""}`,
                    {
                      positive: [
                        ...(market.company_aliases_json ?? []),
                        ...(market.products_games_apps_brands_json ?? []),
                      ],
                      negative: market.negative_aliases_json ?? [],
                    },
                  ),
                }))
                .filter((item) => item.match.matched && item.match.alias);
          const evidence = macroContext
            ? result.documents
            : matches.map((item) => item.document);
          result.metadata = {
            ...result.metadata,
            candidatesReceived: result.documents.length,
            relevantMatches: evidence.length,
            macroContext,
          };
          const deduplicated = deduplicate(evidence);
          const { documents: docs, excluded: excludedByTakedown } =
            await excludeTakedownBlockedDocuments(db, deduplicated);
          result.metadata = { ...result.metadata, excludedByTakedown };
          if (docs.length) {
            const { data: stored, error } = await db
              .from("source_documents")
              .upsert(docs.map(toRow), { onConflict: "content_hash" })
              .select("id,content_hash");
            if (error) throw error;
            summary.documentsStored += docs.length;
            if (!macroContext && stored?.length) {
              const aliasByHash = new Map(
                matches.map((item) => [
                  item.document.contentHash,
                  item.match.alias!,
                ]),
              );
              const links = stored.flatMap((row) => {
                const alias = aliasByHash.get(row.content_hash);
                return alias
                  ? [
                      {
                        document_id: row.id,
                        company_id: company.id,
                        match_method: "literal_alias",
                        matched_alias: alias,
                        match_confidence: null,
                      },
                    ]
                  : [];
              });
              if (links.length) {
                const { error: linkError } = await db
                  .from("document_entities")
                  .upsert(links, { onConflict: "document_id,company_id" });
                if (linkError) throw linkError;
              }
            }
          }
          await db.from("connector_runs").insert({
            connector_name: connector.name,
            job_name: "scheduled-ingest",
            company_id: company.id,
            market_code: market.market_code,
            status:
              result.metadata.stoppedForBackoff === true ||
              Array.isArray(result.metadata.failedFeeds) &&
              result.metadata.failedFeeds.length
                ? "partial"
                : "completed",
            started_at: started.toISOString(),
            completed_at: new Date().toISOString(),
            items_fetched: result.documents.length,
            items_deduplicated: result.documents.length - docs.length,
            items_stored: docs.length,
            api_requests_used: result.requestsUsed,
            metadata_json: result.metadata,
          });
        } catch (error) {
          const errorCode = safeConnectorError(error);
          summary.errors.push(
            `${connector.name}/${company.ticker}: ${errorCode}`,
          );
          await db.from("connector_runs").insert({
            connector_name: connector.name,
            job_name: "scheduled-ingest",
            company_id: company.id,
            market_code: market.market_code,
            status: "failed",
            started_at: started.toISOString(),
            completed_at: new Date().toISOString(),
            error_message: errorCode,
            metadata_json: { error_code: errorCode },
          });
        }
        summary.runs++;
      }
    }
  }
  try {
    summary.metricsWritten = (
      await recomputeEntityDailyMetrics(db)
    ).metricsWritten;
  } catch {
    summary.errors.push("daily_metrics: recomputation failed");
  }
  return NextResponse.json(summary);
}
function parseJson(v: string): string[] {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
function getRssFeeds(marketCode: string) {
  const mapped = parseJson(process.env[`RSS_FEEDS_${marketCode}_JSON`] ?? "");
  return mapped.length ? mapped : parseJson(process.env.RSS_FEEDS_JSON || "[]");
}
function deduplicate(docs: NormalizedDocument[]) {
  const seen = new Set<string>();
  return docs.filter((d) => {
    if (seen.has(d.contentHash)) return false;
    seen.add(d.contentHash);
    return true;
  });
}
function toRow(d: NormalizedDocument) {
  return {
    market_code: d.marketCode,
    source_type: d.sourceType,
    source_name: d.sourceName,
    source_domain: d.sourceDomain,
    language_code: d.languageCode,
    country_code: d.countryCode,
    title_original: d.titleOriginal,
    excerpt_original: d.excerptOriginal,
    source_url: d.sourceUrl,
    canonical_url: d.canonicalUrl,
    published_at: d.publishedAt,
    source_quality_tier: d.sourceQualityTier,
    entity_match_confidence: d.entityMatchConfidence,
    content_hash: d.contentHash,
    raw_metadata_json: d.rawMetadata,
  };
}
