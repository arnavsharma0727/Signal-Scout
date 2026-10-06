import { makeDocument } from "./normalize";
import { fetchWithRetry } from "./fetch";
import { matchesStackExchangeTitleQuery } from "../source-policy";
import type { Connector, ConnectorResult } from "./types";

const endpoint = "https://api.stackexchange.com/2.3/search/advanced";
const HISTORY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const siteQueries: ReadonlyArray<{
  site: string;
  languageCode: string;
  terms: readonly string[];
}> = [
  { site: "economics", languageCode: "en", terms: ["inflation", "interest rates", "tariffs"] },
  { site: "money", languageCode: "en", terms: ["inflation", "interest rates", "ETF"] },
  { site: "ai", languageCode: "en", terms: ["AI", "large language model", "GPU"] },
  { site: "datascience", languageCode: "en", terms: ["AI", "large language model", "data quality"] },
  { site: "security", languageCode: "en", terms: ["ransomware", "data breach", "vulnerability"] },
  { site: "es.stackoverflow", languageCode: "es", terms: ["inteligencia artificial", "GPU", "modelo de lenguaje"] },
  { site: "pt.stackoverflow", languageCode: "pt", terms: ["inteligência artificial", "GPU", "modelo de linguagem"] },
  { site: "ja.stackoverflow", languageCode: "ja", terms: ["生成AI", "LLM", "GPU"] },
  { site: "ru.stackoverflow", languageCode: "ru", terms: ["искусственный интеллект", "LLM", "GPU"] },
  // Current-affairs terms are kept separate so API title matching remains
  // exact and each imported question keeps the query that surfaced it.
  { site: "politics", languageCode: "en", terms: ["tariffs", "sanctions", "trade", "election"] },
  { site: "law", languageCode: "en", terms: ["tariffs", "sanctions", "trade"] },
];
const siteLabels: Record<string, string> = {
  economics: "Economics Stack Exchange",
  money: "Personal Finance & Money Stack Exchange",
  ai: "Artificial Intelligence Stack Exchange",
  datascience: "Data Science Stack Exchange",
  security: "Information Security Stack Exchange",
  "es.stackoverflow": "Stack Overflow en español",
  "pt.stackoverflow": "Stack Overflow em Português",
  "ja.stackoverflow": "スタック・オーバーフロー",
  "ru.stackoverflow": "Stack Overflow на русском",
  politics: "Politics Stack Exchange",
  law: "Law Stack Exchange",
};
const licenseUrl = "https://creativecommons.org/licenses/by-sa/4.0/";

type SearchResponse = {
  items?: Array<{
    title?: string;
    tags?: string[];
    link?: string;
    creation_date?: number;
    content_license?: string;
    owner?: { display_name?: string; link?: string };
  }>;
  quota_remaining?: number;
  backoff?: number;
};

/** Public keyless search; persist only individually CC BY-SA 4.0 licensed items. */
export class StackExchangeConnector implements Connector {
  name = "stack-exchange";
  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(
    input: Parameters<Connector["fetchDocuments"]>[0],
  ): Promise<ConnectorResult> {
    const documents = [];
    let requestsUsed = 0;
    let stoppedForBackoff = false;
    const rejectedUnlicensed = { count: 0 };
    const rejectedTitleMismatch = { count: 0 };
    const historyStart = new Date(input.end.getTime() - HISTORY_LOOKBACK_MS);

    search: for (const { site, languageCode, terms } of siteQueries) {
      for (const term of terms) {
        const params = new URLSearchParams({
          order: "desc",
          sort: "creation",
          site,
          pagesize: "100",
          title: term,
          // Re-sample the same bounded 30-day window each daily run so the
          // descriptive baseline need not wait for 14 cron days.
          fromdate: String(Math.floor(historyStart.getTime() / 1000)),
          todate: String(Math.floor(input.end.getTime() / 1000)),
        });
        const response = await fetchWithRetry(`${endpoint}?${params}`, {
          headers: { accept: "application/json" },
        });
        const body = (await response.json()) as SearchResponse;
        requestsUsed++;

        for (const item of body.items ?? []) {
          if (item.content_license !== "CC BY-SA 4.0") {
            rejectedUnlicensed.count++;
            continue;
          }
          if (!item.title || !item.link || !item.owner?.display_name) continue;
          const title = decodeEntities(item.title);
          // Enforce the API's documented title constraint locally as well.
          // This prevents malformed/upstream-mismatched results from entering
          // discussion baselines or being surfaced as on-topic evidence.
          if (!matchesStackExchangeTitleQuery(title, term)) {
            rejectedTitleMismatch.count++;
            continue;
          }
          const publishedAt = item.creation_date
            ? new Date(item.creation_date * 1000).toISOString()
            : undefined;
          documents.push(
            makeDocument({
              marketCode: "INTL",
              sourceType: "stack-exchange",
              sourceName: siteLabels[site],
              sourceUrl: item.link,
              title,
              publishedAt,
              languageCode,
              tier: 4,
              entityConfidence: 0,
              raw: {
                attributionName: item.owner.display_name,
                attributionUrl: item.owner.link,
                contentLicense: item.content_license,
                licenseUrl,
                site,
                query: term,
                tags: item.tags ?? [],
              },
            }),
          );
        }
        if (body.backoff && body.backoff > 0) {
          // Do not hold a scheduled serverless invocation through a long backoff.
          // Stop making requests instead of violating the API's required wait.
          if (body.backoff > 15) {
            stoppedForBackoff = true;
            break search;
          }
          await new Promise((resolve) => setTimeout(resolve, body.backoff! * 1000));
        }
      }
    }

    const unique = [...new Map(documents.map((doc) => [doc.contentHash, doc])).values()];
    return {
      documents: unique,
      requestsUsed,
      metadata: {
        sites: siteQueries.map(({ site }) => site),
        lookbackDays: 30,
        terms: siteQueries.flatMap(({ site, terms }) =>
          terms.map((term) => ({ site, term })),
        ),
        resultCount: unique.length,
        rejectedUnlicensed: rejectedUnlicensed.count,
        rejectedTitleMismatch: rejectedTitleMismatch.count,
        stoppedForBackoff,
      },
    };
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
