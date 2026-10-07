import { makeDocument } from "./normalize";
import { fetchWithRetry } from "./fetch";
import type { Connector, ConnectorResult } from "./types";

const endpoint = "https://api.stackexchange.com/2.3/questions";
const HISTORY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const LICENSE = "CC BY-SA 4.0";
const COLLECTION_METHOD = "recent-licensed-question-feed";
const sites: ReadonlyArray<{ site: string; languageCode: string }> = [
  { site: "economics", languageCode: "en" },
  { site: "quant", languageCode: "en" },
  { site: "money", languageCode: "en" },
  { site: "politics", languageCode: "en" },
  { site: "law", languageCode: "en" },
  { site: "ai", languageCode: "en" },
  { site: "datascience", languageCode: "en" },
  { site: "security", languageCode: "en" },
  { site: "es.stackoverflow", languageCode: "es" },
  { site: "pt.stackoverflow", languageCode: "pt" },
  { site: "ja.stackoverflow", languageCode: "ja" },
  { site: "ru.stackoverflow", languageCode: "ru" },
];
const siteLabels: Record<string, string> = {
  economics: "Economics Stack Exchange",
  quant: "Quantitative Finance Stack Exchange",
  money: "Personal Finance & Money Stack Exchange",
  politics: "Politics Stack Exchange",
  law: "Law Stack Exchange",
  ai: "Artificial Intelligence Stack Exchange",
  datascience: "Data Science Stack Exchange",
  security: "Information Security Stack Exchange",
  "es.stackoverflow": "Stack Overflow en español",
  "pt.stackoverflow": "Stack Overflow em Português",
  "ja.stackoverflow": "スタック・オーバーフロー",
  "ru.stackoverflow": "Stack Overflow на русском",
};
const siteHosts: Record<string, string> = {
  economics: "economics.stackexchange.com",
  quant: "quant.stackexchange.com",
  money: "money.stackexchange.com",
  politics: "politics.stackexchange.com",
  law: "law.stackexchange.com",
  ai: "ai.stackexchange.com",
  datascience: "datascience.stackexchange.com",
  security: "security.stackexchange.com",
  "es.stackoverflow": "es.stackoverflow.com",
  "pt.stackoverflow": "pt.stackoverflow.com",
  "ja.stackoverflow": "ja.stackoverflow.com",
  "ru.stackoverflow": "ru.stackoverflow.com",
};
const licenseUrl = "https://creativecommons.org/licenses/by-sa/4.0/";

type QuestionsResponse = {
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
  error_id?: number;
  error_message?: string;
};

/**
 * Sample the latest public questions from each reviewed Stack Exchange site.
 * Keep only individually CC BY-SA 4.0 licensed titles and attribution; bodies
 * and answer text are never persisted. This is expert Q&A, not a population poll.
 */
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
    let rejectedUnlicensed = 0;
    let rejectedInvalid = 0;
    const historyStart = new Date(input.end.getTime() - HISTORY_LOOKBACK_MS);

    for (const { site, languageCode } of sites) {
      const params = new URLSearchParams({
        order: "desc",
        sort: "creation",
        site,
        pagesize: "100",
        fromdate: String(Math.floor(historyStart.getTime() / 1000)),
        todate: String(Math.floor(input.end.getTime() / 1000)),
      });
      const response = await fetchWithRetry(`${endpoint}?${params}`, {
        headers: { accept: "application/json" },
      });
      const body = (await response.json()) as QuestionsResponse;
      requestsUsed++;
      if (body.error_id) {
        throw new Error(`Stack Exchange API error ${body.error_id}: ${body.error_message ?? "unknown error"}`);
      }

      for (const item of body.items ?? []) {
        if (item.content_license !== LICENSE) {
          rejectedUnlicensed++;
          continue;
        }
        const title = safeDecodeEntities(item.title ?? "");
        const link = safeHttpsUrl(item.link);
        const author = item.owner?.display_name?.trim();
        const authorUrl = safeHttpsUrl(item.owner?.link);
        const createdAt = typeof item.creation_date === "number" ? item.creation_date * 1000 : NaN;
        if (!title || !link || !author || !authorUrl ||
            link.hostname !== siteHosts[site] || authorUrl.hostname !== siteHosts[site] ||
            !/^\/questions\/\d+\/[^/]+\/?$/.test(link.pathname) ||
            !/^\/users\/\d+(?:\/[^/]+)?\/?$/.test(authorUrl.pathname) ||
            !Number.isFinite(createdAt) || createdAt < historyStart.getTime() || createdAt > input.end.getTime()) {
          rejectedInvalid++;
          continue;
        }

        documents.push(makeDocument({
          marketCode: "INTL",
          sourceType: "stack-exchange",
          sourceName: siteLabels[site],
          sourceUrl: link.toString(),
          title,
          publishedAt: new Date(createdAt).toISOString(),
          languageCode,
          tier: 4,
          entityConfidence: 0,
          raw: {
            attributionName: author,
            attributionUrl: authorUrl.toString(),
            contentLicense: LICENSE,
            licenseUrl,
            site,
            collectionMethod: COLLECTION_METHOD,
            titleUnmodified: true,
            tags: (item.tags ?? []).filter((tag): tag is string => typeof tag === "string").slice(0, 20),
            questionBodyRetained: false,
            answerBodyRetained: false,
          },
        }));
      }

      if (body.backoff && body.backoff > 0) {
        if (body.backoff > 15) {
          stoppedForBackoff = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, body.backoff! * 1000));
      }
    }

    const unique = [...new Map(documents.map((doc) => [doc.contentHash, doc])).values()];
    return {
      documents: unique,
      requestsUsed,
      metadata: {
        sites: sites.map(({ site }) => site),
        lookbackDays: 30,
        collectionMethod: COLLECTION_METHOD,
        pageSizePerCommunity: 100,
        resultCount: unique.length,
        rejectedUnlicensed,
        rejectedInvalid,
        stoppedForBackoff,
      },
    };
  }
}

function safeHttpsUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
}

function safeDecodeEntities(value: string): string | null {
  try {
    return value
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  } catch {
    return null;
  }
}
