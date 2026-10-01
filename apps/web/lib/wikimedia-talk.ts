export const WIKIMEDIA_TALK_WIKIS = [
  { language: "en", label: "English", wiki: "English Wikipedia" },
  { language: "es", label: "Español", wiki: "Wikipedia en español" },
  { language: "de", label: "Deutsch", wiki: "Deutschsprachige Wikipedia" },
  { language: "ko", label: "한국어", wiki: "한국어 위키백과" },
  { language: "ja", label: "日本語", wiki: "日本語版ウィキペディア" },
  { language: "pt", label: "Português", wiki: "Wikipédia em português" },
  { language: "fr", label: "Français", wiki: "Wikipédia en français" },
  { language: "zh", label: "中文", wiki: "中文维基百科" },
  { language: "ar", label: "العربية", wiki: "ويكيبيديا العربية" },
  { language: "id", label: "Bahasa Indonesia", wiki: "Wikipedia bahasa Indonesia" },
] as const;

export type WikimediaTalkPage = {
  pageId: number;
  title: string;
  url: string;
  historyUrl: string;
  snippetHtml: string;
  lastEditedAt: string;
  language: string;
  wiki: string;
};

type SearchResponse = {
  query?: {
    search?: Array<{
      pageid?: number;
      title?: string;
      timestamp?: string;
      snippet?: string;
    }>;
  };
};

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/** One transient search of recent namespace-1 pages on a selected Wikipedia. */
export async function searchWikimediaTalk(
  input: string,
  language: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<WikimediaTalkPage[]> {
  const query = input.trim();
  const site = WIKIMEDIA_TALK_WIKIS.find((item) => item.language === language);
  if (query.length < 2 || query.length > 100 || !site) {
    throw new Error("Enter a topic of 2–100 characters and choose a listed wiki.");
  }

  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srnamespace: "1",
    srwhat: "text",
    srprop: "timestamp|snippet",
    srsort: "relevance",
    srlimit: "20",
    srsearch: query,
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const response = await fetcher(
    `https://${site.language}.wikipedia.org/w/api.php?${params}`,
    {
      headers: {
        accept: "application/json",
        "Api-User-Agent": "SignalScout/0.1 (https://signal-scout-xi-ruby.vercel.app/)",
      },
    },
  );
  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      throw new Error("Wikimedia is rate-limiting or temporarily unavailable. Try again later.");
    }
    throw new Error("The selected Wikimedia source is temporarily unavailable.");
  }

  const body = (await response.json()) as SearchResponse;
  return (body.query?.search ?? []).flatMap((item) => {
    const timestamp = item.timestamp ? Date.parse(item.timestamp) : NaN;
    if (
      typeof item.pageid !== "number" ||
      typeof item.title !== "string" ||
      typeof item.snippet !== "string" ||
      /\/archive(?:\b|\/)/i.test(item.title) ||
      !Number.isFinite(timestamp) ||
      timestamp > now ||
      now - timestamp > MAX_AGE_MS
    ) return [];

    const path = item.title.replace(/ /g, "_");
    const url = `https://${site.language}.wikipedia.org/wiki/${encodeURIComponent(path)}`;
    return [{
      pageId: item.pageid,
      title: item.title,
      url,
      historyUrl: `${url}?action=history`,
      snippetHtml: item.snippet,
      lastEditedAt: new Date(timestamp).toISOString(),
      language: site.label,
      wiki: site.wiki,
    }];
  });
}
