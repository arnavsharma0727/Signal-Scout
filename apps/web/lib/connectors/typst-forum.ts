import { XMLParser } from "fast-xml-parser";
import { fetchWithRetry } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

export const TYPST_FORUM_FEED = "https://forum.typst.app/latest.rss";
export const TYPST_FORUM_LICENSE_START = new Date("2024-09-15T13:33:00.000Z");
const TYPST_FORUM_GUIDELINES = "https://forum.typst.app/guidelines";
const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/";
const MAX_FEED_BYTES = 250_000;

/** One daily, public RSS request. Only post-cutoff CC BY 4.0 titles and attribution metadata are retained. */
export class TypstForumConnector implements Connector {
  name = "typst-forum";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(input: Parameters<Connector["fetchDocuments"]>[0]): Promise<ConnectorResult> {
    const response = await fetchWithRetry(TYPST_FORUM_FEED, {
      headers: { accept: "application/rss+xml, application/xml" },
    }, { attempts: 2, timeoutMs: 12_000 });
    const finalUrl = new URL(response.url || TYPST_FORUM_FEED);
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "forum.typst.app" || finalUrl.pathname !== "/latest.rss") {
      throw new Error("Typst forum feed redirected outside the allowlist");
    }
    const xml = await readBoundedText(response, MAX_FEED_BYTES);
    if (xml === null) throw new Error("Typst forum feed exceeded the size limit");

    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as Record<string, any>;
    const channel = parsed.rss?.channel;
    if (channel?.title !== "Typst Forum - Latest topics") throw new Error("Unexpected Typst forum RSS channel");
    const rawItems = channel.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const documents: ReturnType<typeof makeDocument>[] = [];
    let rejected = 0;

    for (const item of items) {
      const title = asText(item.title).trim();
      const author = asText(item["dc:creator"]).trim().slice(0, 120);
      const publishedAt = new Date(asText(item.pubDate));
      let sourceUrl: URL;
      try {
        sourceUrl = new URL(asText(item.link));
      } catch {
        rejected++;
        continue;
      }
      if (!title || !author || !Number.isFinite(publishedAt.getTime()) ||
        publishedAt < TYPST_FORUM_LICENSE_START || publishedAt < input.start || publishedAt > input.end ||
        sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "forum.typst.app" ||
        !/^\/t\/[^/]+\/\d+(?:\/\d+)?\/?$/.test(sourceUrl.pathname)) {
        rejected++;
        continue;
      }

      documents.push(makeDocument({
        marketCode: "INTL",
        sourceType: "licensed-forum",
        sourceName: "Typst Forum · community discussion",
        sourceUrl: sourceUrl.toString(),
        title,
        publishedAt: publishedAt.toISOString(),
        tier: 3,
        entityConfidence: 0,
        raw: {
          publisher: "Typst Forum",
          author,
          licenseName: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
          licenseUrl: CC_BY_4,
          attributionPolicyUrl: TYPST_FORUM_GUIDELINES,
          licenseEffectiveAt: TYPST_FORUM_LICENSE_START.toISOString(),
          titleUnmodified: true,
          postBodyAndSummaryDiscarded: true,
          languageInferred: false,
          geographicMarketInferred: false,
          publisherIndependenceInferred: false,
        },
      }));
    }

    return {
      documents,
      requestsUsed: 1,
      metadata: {
        feedItemsReceived: items.length,
        documentsAccepted: documents.length,
        itemsRejected: rejected,
        licenseCutoffEnforced: TYPST_FORUM_LICENSE_START.toISOString(),
        contentStored: "unmodified topic title, author attribution, date, and original link only",
        postBodiesAndSummariesRetained: false,
        forumUse: "narrow Typst software community; not financial or population sentiment",
      },
    };
  }
}

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return asText((value as { "#text": unknown })["#text"]);
  return "";
}

async function readBoundedText(response: Response, maximumBytes: number): Promise<string | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) return null;
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= maximumBytes ? text : null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
