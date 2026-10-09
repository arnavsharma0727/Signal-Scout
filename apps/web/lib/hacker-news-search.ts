export type HackerNewsDiscussion = {
  id: string;
  url: string;
  title: string;
  author: string;
  createdAt: string;
  transientPreview: string;
};

type ApiResponse = {
  hits?: Array<{
    objectID?: string;
    author?: string;
    comment_text?: string | null;
    story_title?: string | null;
    created_at?: string;
  }>;
};

const API = "https://hn.algolia.com/api/v1/search";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Query the public Algolia index of Hacker News comments; no account or API key. */
export async function searchHackerNewsComments(
  input: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<HackerNewsDiscussion[]> {
  const query = input.trim();
  if (query.length < 2 || query.length > 100) throw new Error("Enter a search phrase with 2–100 characters.");
  const queryTerms = meaningfulTerms(query);
  if (!queryTerms.length) return [];

  const endpoint = new URL(API);
  endpoint.search = new URLSearchParams({
    query,
    tags: "comment",
    hitsPerPage: "20",
    numericFilters: `created_at_i>${Math.floor((now - MAX_AGE_MS) / 1000)}`,
  }).toString();
  const response = await fetcher(endpoint, { headers: { accept: "application/json" } });
  if (response.status === 429) throw new Error("Hacker News search is rate-limiting requests. Try again later.");
  if (!response.ok) throw new Error("Hacker News discussion search is temporarily unavailable.");

  const body = await response.json() as ApiResponse;
  if (!Array.isArray(body.hits)) return [];
  const oldest = now - MAX_AGE_MS;
  return body.hits.flatMap((hit) => {
    const id = hit.objectID;
    const author = hit.author?.trim();
    const createdAt = hit.created_at ? Date.parse(hit.created_at) : NaN;
    const preview = plainText(hit.comment_text ?? "");
    const searchableText = `${hit.story_title ?? ""} ${preview}`;
    if (!id || !/^\d+$/.test(id) || !author || !preview || !Number.isFinite(createdAt) || createdAt < oldest || createdAt > now || !containsQueryTerms(searchableText, queryTerms, query)) return [];
    return [{
      id,
      url: `https://news.ycombinator.com/item?id=${id}`,
      title: hit.story_title ? `Comment on: ${plainText(hit.story_title).slice(0, 180)}` : "Hacker News comment",
      author,
      createdAt: new Date(createdAt).toISOString(),
      transientPreview: preview.slice(0, 900),
    }];
  });
}

const STOP_WORDS = new Set(["a", "an", "and", "are", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with"]);

function meaningfulTerms(value: string) {
  return [...new Set(value.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function containsQueryTerms(value: string, terms: string[], query: string) {
  if (!terms.length) return true;
  const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";
  const quoted = query.trim().match(/^"(.+)"$/u)?.[1];
  if (quoted) return normalize(value).includes(normalize(quoted));
  const contentTerms = new Set(meaningfulTerms(value));
  return terms.every((term) => contentTerms.has(term));
}

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?>|<\/p\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => decode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => decode(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ").trim();
}

function decode(codePoint: number) {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
    ? String.fromCodePoint(codePoint)
    : "�";
}
