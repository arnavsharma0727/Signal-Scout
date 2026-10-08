export const DISCUSSION_COMMUNITIES = [
  { site: "economics", label: "Economics Stack Exchange", language: "English" },
  { site: "quant", label: "Quantitative Finance Stack Exchange", language: "English" },
  { site: "money", label: "Personal Finance & Money", language: "English" },
  { site: "ai", label: "Artificial Intelligence", language: "English" },
  { site: "datascience", label: "Data Science", language: "English" },
  { site: "security", label: "Information Security", language: "English" },
  { site: "es.stackoverflow", label: "Stack Overflow en español", language: "Spanish" },
  { site: "pt.stackoverflow", label: "Stack Overflow em Português", language: "Portuguese" },
  { site: "ja.stackoverflow", label: "スタック・オーバーフロー", language: "Japanese" },
  { site: "ru.stackoverflow", label: "Stack Overflow на русском", language: "Russian" },
  { site: "literature", label: "Literature Stack Exchange", language: "English" },
  { site: "politics", label: "Politics Stack Exchange", language: "English" },
  { site: "law", label: "Law Stack Exchange", language: "English" },
] as const;

export type LiveDiscussionItem = {
  id: number;
  title: string;
  url: string;
  createdAt: string;
  tags: string[];
  author: string;
  authorUrl: string;
  community: string;
  language: string;
  licenseUrl: string;
};

const LICENSE = "CC BY-SA 4.0";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const API = "https://api.stackexchange.com/2.3/search/advanced";

type ApiResponse = {
  items?: Array<{
    question_id?: number;
    title?: string;
    link?: string;
    creation_date?: number;
    content_license?: string;
    tags?: string[];
    owner?: { display_name?: string; link?: string };
  }>;
};

/** Search one selected Stack Exchange community; only explicitly licensed items are returned. */
export async function searchLiveDiscussion(
  topic: string,
  site: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<LiveDiscussionItem[]> {
  const query = topic.trim();
  const community = DISCUSSION_COMMUNITIES.find((item) => item.site === site);
  if (query.length < 3 || query.length > 80 || !community) {
    throw new Error("Enter a topic of 3–80 characters and choose a listed community.");
  }

  const params = new URLSearchParams({
    order: "desc",
    sort: "relevance",
    site: community.site,
    title: query,
    pagesize: "25",
    fromdate: String(Math.floor((now - 30 * 24 * 60 * 60 * 1000) / 1000)),
    todate: String(Math.floor(now / 1000)),
    filter: "default",
    origin: "*",
  });
  const response = await fetcher(`${API}?${params}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Stack Exchange is rate-limiting requests. Try again later.");
    throw new Error("The live source is temporarily unavailable. Try again later.");
  }

  const body = (await response.json()) as ApiResponse;
  return (body.items ?? []).flatMap((item) => {
    if (
      item.content_license !== LICENSE ||
      typeof item.question_id !== "number" ||
      typeof item.title !== "string" ||
      typeof item.link !== "string" ||
      typeof item.creation_date !== "number" ||
      typeof item.owner?.display_name !== "string" ||
      typeof item.owner.link !== "string"
    ) return [];

    return [{
      id: item.question_id,
      title: decodeEntities(item.title),
      url: item.link,
      createdAt: new Date(item.creation_date * 1000).toISOString(),
      tags: (item.tags ?? []).filter((tag): tag is string => typeof tag === "string"),
      author: item.owner.display_name,
      authorUrl: item.owner.link,
      community: community.label,
      language: community.language,
      licenseUrl: LICENSE_URL,
    }];
  });
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
