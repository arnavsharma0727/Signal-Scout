import { XMLParser } from "fast-xml-parser";
import { fetchWithRetry } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

export const GLOBAL_VOICES_LICENSE = "https://creativecommons.org/licenses/by/3.0/";
export const GLOBAL_VOICES_FEEDS = [
  { language: "en", label: "English", host: "globalvoices.org", feedTitle: "Global Voices" },
  { language: "es", label: "Spanish", host: "es.globalvoices.org", feedTitle: "Global Voices en Español" },
  { language: "fr", label: "French", host: "fr.globalvoices.org", feedTitle: "Global Voices en Français" },
  { language: "pt", label: "Portuguese", host: "pt.globalvoices.org", feedTitle: "Global Voices em Português" },
  { language: "ar", label: "Arabic", host: "ar.globalvoices.org", feedTitle: "Global Voices الأصوات العالمية" },
  { language: "ru", label: "Russian", host: "ru.globalvoices.org", feedTitle: "Global Voices по-русски" },
  { language: "it", label: "Italian", host: "it.globalvoices.org", feedTitle: "Global Voices in Italiano" },
  { language: "nl", label: "Dutch", host: "nl.globalvoices.org", feedTitle: "Global Voices in het Nederlands" },
  { language: "yo", label: "Yoruba", host: "yo.globalvoices.org", feedTitle: "Global Voices ní-Yorùbá" },
  { language: "uk", label: "Ukrainian", host: "uk.globalvoices.org", feedTitle: "Global Voices по-українськи" },
  { language: "el", label: "Greek", host: "el.globalvoices.org", feedTitle: "Global Voices στα Ελληνικά" },
  { language: "ca", label: "Catalan", host: "ca.globalvoices.org", feedTitle: "Global Voices en Català" },
] as const;
const MAX_FEED_BYTES = 500_000;
const PUBLICATION_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const SITE_LICENSE_NOTICE =
  "Global Voices-created content is licensed CC BY unless otherwise stated.";

/** Localized Global Voices CC BY feeds; full story text and media are discarded. */
export class GlobalVoicesConnector implements Connector {
  name = "global-voices";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(
    input: Parameters<Connector["fetchDocuments"]>[0],
  ): Promise<ConnectorResult> {
    const documents: ReturnType<typeof makeDocument>[] = [];
    const failedFeeds: string[] = [];
    const editionResults: Array<{
      language: string;
      feedItemsReceived: number;
      documentsAccepted: number;
      status: "completed" | "failed";
    }> = [];
    let feedItemsReceived = 0;
    const publicationStart = new Date(input.end.getTime() - PUBLICATION_LOOKBACK_MS);
    for (const edition of GLOBAL_VOICES_FEEDS) {
      const feedUrl = `https://${edition.host}/feed/`;
      let editionItemCount = 0;
      let documentsAccepted = 0;
      try {
        const response = await fetchWithRetry(feedUrl, {
          headers: { accept: "application/rss+xml, application/xml" },
        }, { attempts: 2, timeoutMs: 12_000 });
        const finalUrl = new URL(response.url || feedUrl);
        if (
          finalUrl.protocol !== "https:" ||
          finalUrl.hostname !== edition.host ||
          !["/feed", "/feed/"].includes(finalUrl.pathname) ||
          finalUrl.search !== "" ||
          finalUrl.hash !== ""
        ) throw new Error("Feed redirected outside its approved edition host");

        const xml = await readBoundedText(response, MAX_FEED_BYTES);
        if (xml === null) throw new Error("Feed exceeded its size limit");
        const parsed = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
        }).parse(xml) as Record<string, any>;
        const channel = parsed.rss?.channel;
        if (!channel || asText(channel.title).trim() !== edition.feedTitle) {
          throw new Error("Feed edition identity did not match the approved publisher profile");
        }

        const rawItems = channel.item ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];
        editionItemCount = items.length;
        feedItemsReceived += items.length;
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
            !title || !author || !date || !Number.isFinite(date.getTime()) ||
            date < publicationStart || date > input.end ||
            sourceUrl.protocol !== "https:" ||
            sourceUrl.hostname !== edition.host ||
            sourceUrl.pathname === "/" ||
            !hasNoConflictingItemRights(item)
          ) continue;

          const categories = (Array.isArray(item.category)
            ? item.category
            : [item.category]
          )
            .map((category: unknown) => asText(category).trim().slice(0, 100))
            .filter(Boolean)
            .slice(0, 12);
          documents.push(makeDocument({
            marketCode: "INTL",
            sourceType: "licensed-reporting",
            sourceName: `Global Voices · ${edition.label} edition`,
            sourceUrl: sourceUrl.toString(),
            title,
            publishedAt: date.toISOString(),
            languageCode: edition.language,
            tier: 2,
            entityConfidence: 0,
            raw: {
              publisher: "Global Voices",
              editionCode: edition.language,
              editionLabel: edition.label,
              author,
              licenseName: "Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
              licenseUrl: GLOBAL_VOICES_LICENSE,
              licenseNotice: SITE_LICENSE_NOTICE,
              attributionRequired: true,
              attributionPolicyUrl: "https://globalvoices.org/about/global-voices-attribution-policy/",
              feedUrl,
              categories,
              titleUnmodified: true,
              excerptDiscarded: true,
              articleBodyDiscarded: true,
              mediaDiscarded: true,
              crossEditionDuplicateRisk: true,
              publisherIndependenceInferred: false,
              geographicMarketInferred: false,
            },
          }));
          documentsAccepted++;
        }
        editionResults.push({ language: edition.language, feedItemsReceived: editionItemCount, documentsAccepted, status: "completed" });
      } catch {
        failedFeeds.push(edition.language);
        editionResults.push({ language: edition.language, feedItemsReceived: editionItemCount, documentsAccepted, status: "failed" });
      }
    }

    return {
      documents,
      requestsUsed: GLOBAL_VOICES_FEEDS.length,
      metadata: {
        resultCount: documents.length,
        feedItemsReceived,
        lookbackDays: 7,
        editionsQueried: GLOBAL_VOICES_FEEDS.map(({ language }) => language),
        editionsSucceeded: GLOBAL_VOICES_FEEDS.map(({ language }) => language).filter((language) => !failedFeeds.includes(language)),
        failedFeeds,
        editionResults,
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
