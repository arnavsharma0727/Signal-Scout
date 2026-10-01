import { XMLParser } from "fast-xml-parser";
import { fetchWithRetry } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

export const GLOBAL_VOICES_FEED = "https://globalvoices.org/feed/";
export const GLOBAL_VOICES_LICENSE = "https://creativecommons.org/licenses/by/3.0/";
const ALLOWED_HOST = "globalvoices.org";
const MAX_FEED_BYTES = 1_000_000;
const SITE_LICENSE_NOTICE =
  "Global Voices-created content is licensed CC BY unless otherwise stated.";

/** Global Voices' CC BY newsroom RSS; full story text and media are discarded. */
export class GlobalVoicesConnector implements Connector {
  name = "global-voices";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(
    input: Parameters<Connector["fetchDocuments"]>[0],
  ): Promise<ConnectorResult> {
    const response = await fetchWithRetry(GLOBAL_VOICES_FEED, {
      headers: { accept: "application/rss+xml, application/xml" },
    });
    const finalUrl = new URL(response.url || GLOBAL_VOICES_FEED);
    if (
      finalUrl.protocol !== "https:" ||
      finalUrl.hostname !== ALLOWED_HOST ||
      finalUrl.pathname !== "/feed/"
    ) {
      throw new Error("Global Voices feed resolved outside the approved endpoint");
    }

    const xml = await readBoundedText(response, MAX_FEED_BYTES);
    if (xml === null) throw new Error("Global Voices feed exceeded the size limit");
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    }).parse(xml) as Record<string, any>;
    const channel = parsed.rss?.channel;
    if (
      !channel ||
      typeof channel.language !== "string" ||
      !channel.language.toLocaleLowerCase().startsWith("en")
    ) {
      throw new Error("Global Voices feed language is missing or unsupported");
    }

    const rawItems = channel.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const documents: ReturnType<typeof makeDocument>[] = [];
    for (const item of items) {
      const title = asText(item.title).trim();
      const author = asText(item["dc:creator"]).trim().slice(0, 200);
      const publishedAt = asText(item.pubDate).trim();
      const date = publishedAt ? new Date(publishedAt) : null;
      let sourceUrl: URL;
      try {
        sourceUrl = new URL(asText(item.link).trim());
      } catch {
        continue;
      }
      if (
        !title ||
        !author ||
        !date ||
        !Number.isFinite(date.getTime()) ||
        date < input.start ||
        date > input.end ||
        sourceUrl.protocol !== "https:" ||
        sourceUrl.hostname !== ALLOWED_HOST ||
        sourceUrl.pathname === "/" ||
        !hasNoConflictingItemRights(item)
      ) {
        continue;
      }

      const categories = (Array.isArray(item.category)
        ? item.category
        : [item.category]
      )
        .map((category: unknown) => asText(category).trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 12);
      documents.push(
        makeDocument({
          marketCode: "INTL",
          sourceType: "licensed-reporting",
          sourceName: "Global Voices · community reporting",
          sourceUrl: sourceUrl.toString(),
          title,
          publishedAt: date.toISOString(),
          languageCode: "en",
          tier: 2,
          entityConfidence: 0,
          raw: {
            publisher: "Global Voices",
            author,
            licenseName: "Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
            licenseUrl: GLOBAL_VOICES_LICENSE,
            licenseNotice: SITE_LICENSE_NOTICE,
            attributionRequired: true,
            attributionPolicyUrl:
              "https://globalvoices.org/about/global-voices-attribution-policy/",
            feedUrl: GLOBAL_VOICES_FEED,
            categories,
            titleUnmodified: true,
            excerptDiscarded: true,
            articleBodyDiscarded: true,
            mediaDiscarded: true,
            geographicMarketInferred: false,
          },
        }),
      );
    }

    return {
      documents,
      requestsUsed: 1,
      metadata: {
        resultCount: documents.length,
        feedItemsReceived: items.length,
        siteLicenseDefault: SITE_LICENSE_NOTICE,
        itemRightsExceptionsRejected: true,
        bodyAndMediaRetained: false,
      },
    };
  }
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value)
    return String((value as { "#text": unknown })["#text"] ?? "");
  return "";
}

function hasNoConflictingItemRights(item: Record<string, unknown>) {
  const notices = [item.rights, item["dc:rights"], item.copyright]
    .map(asText)
    .map((notice) => notice.trim().toLocaleLowerCase())
    .filter(Boolean);
  return notices.every(
    (notice) =>
      (notice.includes("creative commons") || notice.includes("cc by")) &&
      notice.includes("3.0"),
  );
}

async function readBoundedText(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}
