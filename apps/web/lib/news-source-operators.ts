export type ReviewedNewsOperator = {
  key: string;
  label: string;
  referenceUrl: string;
};

const REVIEWED_NEWS_HOSTS: ReadonlyArray<{
  host: string;
  operator: ReviewedNewsOperator;
}> = [
  {
    host: "apnews.com",
    operator: {
      key: "associated-press",
      label: "Associated Press",
      referenceUrl: "https://www.ap.org/about/",
    },
  },
  {
    host: "theguardian.com",
    operator: {
      key: "guardian-news-media",
      label: "The Guardian",
      referenceUrl: "https://www.theguardian.com/about",
    },
  },
  {
    host: "reuters.com",
    operator: {
      key: "reuters",
      label: "Reuters",
      referenceUrl: "https://www.thomsonreuters.com/en/products-services/news-media",
    },
  },
];

/**
 * Resolve a publisher only from the actual HTTPS article URL, never an index's
 * claimed domain, display title, or a redirect/syndication URL. This is a
 * small reviewed allowlist, not a general publisher ownership database.
 */
export function reviewedNewsOperatorForUrl(value: string): ReviewedNewsOperator | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
  const entry = REVIEWED_NEWS_HOSTS.find(({ host: root }) => host === root || host.endsWith(`.${root}`));
  return entry?.operator ?? null;
}
