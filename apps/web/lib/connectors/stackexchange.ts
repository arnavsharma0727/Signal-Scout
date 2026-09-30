import { makeDocument } from "./normalize";
import { fetchWithRetry } from "./fetch";
import type { Connector, ConnectorResult } from "./types";

const endpoint = "https://api.stackexchange.com/2.3/search/advanced";
const sites = ["economics", "money"] as const;
const terms = ["inflation", "interest rates", "AI"] as const;
const licenseUrl = "https://creativecommons.org/licenses/by-sa/4.0/";

type SearchResponse = {
  items?: Array<{
    title?: string;
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

    search: for (const site of sites) {
      for (const term of terms) {
        const params = new URLSearchParams({
          order: "desc",
          sort: "creation",
          site,
          pagesize: "50",
          intitle: term,
          fromdate: String(Math.floor(input.start.getTime() / 1000)),
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
          const publishedAt = item.creation_date
            ? new Date(item.creation_date * 1000).toISOString()
            : undefined;
          const title = decodeEntities(item.title);
          documents.push(
            makeDocument({
              marketCode: "INTL",
              sourceType: "stack-exchange",
              sourceName: `Stack Exchange · ${site}`,
              sourceUrl: item.link,
              title,
              publishedAt,
              languageCode: "en",
              tier: 4,
              entityConfidence: 0,
              raw: {
                attributionName: item.owner.display_name,
                attributionUrl: item.owner.link,
                contentLicense: item.content_license,
                licenseUrl,
                site,
                query: term,
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
        sites,
        terms,
        resultCount: unique.length,
        rejectedUnlicensed: rejectedUnlicensed.count,
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
