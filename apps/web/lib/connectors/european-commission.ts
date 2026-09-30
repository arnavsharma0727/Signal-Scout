import { XMLParser } from "fast-xml-parser";
import { fetchWithRetry } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

export const EUROPEAN_COMMISSION_RSS =
  "https://ec.europa.eu/commission/presscorner/api/rss?language=en";
const ALLOWED_HOST = "ec.europa.eu";
const MAX_FEED_BYTES = 500_000;

/** Official EU institutional context. Only title, source URL, and date are retained. */
export class EuropeanCommissionConnector implements Connector {
  name = "european-commission-presscorner";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(
    input: Parameters<Connector["fetchDocuments"]>[0],
  ): Promise<ConnectorResult> {
    const response = await fetchWithRetry(EUROPEAN_COMMISSION_RSS, {
      headers: { accept: "application/rss+xml, application/xml" },
    });
    const finalUrl = new URL(response.url || EUROPEAN_COMMISSION_RSS);
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== ALLOWED_HOST) {
      throw new Error("European Commission RSS redirected outside its publisher host");
    }

    const xml = await response.text();
    if (Buffer.byteLength(xml, "utf8") > MAX_FEED_BYTES) {
      throw new Error("European Commission RSS response exceeded size limit");
    }

    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    }).parse(xml) as Record<string, any>;
    const rawItems = parsed.rss?.channel?.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const documents = items.flatMap((item: Record<string, any>) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const link = typeof item.link === "string" ? item.link : "";
      const dateValue = item.pubDate;
      const date = dateValue ? new Date(dateValue) : null;
      if (
        !title || !link || !date || !Number.isFinite(date.getTime()) ||
        date < input.start || date > input.end
      ) return [];

      try {
        const sourceUrl = new URL(link, EUROPEAN_COMMISSION_RSS);
        if (
          sourceUrl.protocol !== "https:" ||
          sourceUrl.hostname !== ALLOWED_HOST ||
          !sourceUrl.pathname.startsWith("/commission/presscorner/detail/")
        ) return [];

        return [makeDocument({
          marketCode: "INTL",
          sourceType: "official-policy",
          sourceName: "European Commission Presscorner",
          sourceUrl: sourceUrl.toString(),
          title,
          publishedAt: date.toISOString(),
          languageCode: sourceUrl.pathname.split("/")[4] || "en",
          tier: 1,
          entityConfidence: 0,
          raw: {
            publisher: "European Commission",
            license: "CC-BY-4.0",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
            attributionRequired: true,
            sourceTermsUrl: "https://commission.europa.eu/legal-notice_en",
            contentPolicy: "title-link-date-only",
            evidenceRole: "official institutional context; not independent news or public discussion",
            rssDescriptionDiscarded: true,
          },
        })];
      } catch {
        return [];
      }
    });

    return {
      documents,
      requestsUsed: 1,
      metadata: {
        feed: "European Commission Presscorner English RSS",
        resultCount: documents.length,
        contentStored: "title-link-date-only",
        attribution: "European Commission; CC BY 4.0 unless otherwise noted",
      },
    };
  }
}
