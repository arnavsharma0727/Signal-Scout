import { WIKIMEDIA_TALK_WIKIS } from "../wikimedia-talk";
import { fetchWithRetry, safeConnectorError } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

const MAX_ITEMS_PER_EDITION = 500;
const MAX_RESPONSE_BYTES = 1_000_000;
const USER_AGENT =
  "SignalScout/1.0 (https://signal-scout-xi-ruby.vercel.app)";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

type RecentChange = {
  title?: string;
  timestamp?: string;
  revid?: number;
  ns?: number;
  bot?: boolean;
  minor?: boolean;
};

type RecentChangesResponse = {
  query?: { recentchanges?: RecentChange[] };
  continue?: Record<string, string | number>;
  error?: { code?: string };
};

/**
 * Recent non-bot, non-minor edits to article talk pages in ten language
 * editions. Only page/revision metadata is retained; no author, comment, or
 * talk-page content is requested or stored.
 */
export class WikimediaTalkConnector implements Connector {
  name = "wikimedia-talk";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(
    input: Parameters<Connector["fetchDocuments"]>[0],
  ): Promise<ConnectorResult> {
    const documents: ReturnType<typeof makeDocument>[] = [];
    const editionResults: Array<Record<string, unknown>> = [];
    const failedFeeds: Array<Record<string, string>> = [];
    let requestsUsed = 0;

    // Sequential, one-request-per-edition access. Never paginate beyond the
    // bounded newest-500 sample, and respect API Retry-After on failures.
    for (const edition of WIKIMEDIA_TALK_WIKIS) {
      const endpoint = `https://${edition.language}.wikipedia.org/w/api.php`;
      const params = new URLSearchParams({
        action: "query",
        list: "recentchanges",
        rcnamespace: "1",
        rcprop: "title|timestamp|ids|flags",
        rcshow: "!bot|!minor",
        rctype: "edit|new",
        rclimit: String(MAX_ITEMS_PER_EDITION),
        rcstart: input.end.toISOString(),
        rcend: input.start.toISOString(),
        rcdir: "older",
        maxlag: "5",
        format: "json",
        formatversion: "2",
      });

      try {
        const response = await fetchWithRetry(`${endpoint}?${params}`, {
          headers: {
            accept: "application/json",
            "User-Agent": USER_AGENT,
          },
        });
        const finalUrl = new URL(response.url || endpoint);
        if (
          finalUrl.protocol !== "https:" ||
          finalUrl.hostname !== `${edition.language}.wikipedia.org` ||
          finalUrl.pathname !== "/w/api.php"
        ) {
          throw new Error("Wikimedia API redirected outside the selected edition");
        }
        const body = await readBoundedJson(response);
        if (body.error) throw new Error("Wikimedia API returned an error");

        const items = body.query?.recentchanges ?? [];
        let retained = 0;
        for (const change of items) {
          const timestamp = change.timestamp ? Date.parse(change.timestamp) : NaN;
          if (
            change.ns !== 1 ||
            change.bot === true ||
            change.minor === true ||
            !change.title ||
            !Number.isSafeInteger(change.revid) ||
            !Number.isFinite(timestamp) ||
            timestamp < input.start.getTime() ||
            timestamp > input.end.getTime()
          ) {
            continue;
          }

          const revisionUrl = new URL("/w/index.php", `https://${edition.language}.wikipedia.org`);
          revisionUrl.searchParams.set("title", change.title);
          revisionUrl.searchParams.set("oldid", String(change.revid));
          documents.push(
            makeDocument({
              marketCode: "INTL",
              sourceType: "wikimedia-talk",
              sourceName: `Wikimedia · ${edition.wiki} talk pages`,
              sourceUrl: revisionUrl.toString(),
              title: change.title,
              publishedAt: new Date(timestamp).toISOString(),
              languageCode: edition.language,
              tier: 4,
              entityConfidence: 0,
              raw: {
                publisher: edition.wiki,
                editionLanguage: edition.language,
                namespace: 1,
                revisionId: change.revid,
                licenseName: "Creative Commons Attribution-ShareAlike 4.0 International",
                licenseUrl: LICENSE_URL,
                alternateLicenseName: "GNU Free Documentation License",
                attributionMethod: "linked page revision/history",
                talkContentRetained: false,
                contributorNameOrIdRetained: false,
                editSummaryRetained: false,
                botEditsExcluded: true,
                minorEditsExcluded: true,
                titleUnmodified: true,
                geographicAudienceInferred: false,
                notMarketSentiment: true,
              },
            }),
          );
          retained++;
        }
        editionResults.push({
          language: edition.language,
          received: items.length,
          retained,
          capped: Boolean(body.continue),
        });
      } catch (error) {
        failedFeeds.push({
          language: edition.language,
          code: safeConnectorError(error),
        });
        editionResults.push({ language: edition.language, failed: true });
      }
      requestsUsed++;
    }

    return {
      documents: [...new Map(documents.map((doc) => [doc.contentHash, doc])).values()],
      requestsUsed,
      metadata: {
        editions: editionResults,
        failedFeeds,
        lookbackHours: Math.round((input.end.getTime() - input.start.getTime()) / 3_600_000),
        maxItemsPerEdition: MAX_ITEMS_PER_EDITION,
        resultCount: documents.length,
        contributorIdentifiersRetained: false,
        talkTextRetained: false,
        sampleIsCappedWhenMoreIsTrue: true,
      },
    };
  }
}

async function readBoundedJson(response: Response): Promise<RecentChangesResponse> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES)
    throw new Error("Wikimedia response exceeded the size limit");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Wikimedia response body was unavailable");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Wikimedia response exceeded the size limit");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks, total).toString("utf8")) as RecentChangesResponse;
}
