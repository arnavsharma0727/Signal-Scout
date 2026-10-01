export type MastodonPublicPost = {
  id: string;
  url: string;
  createdAt: string;
  contentHtml: string;
  contentWarning: string;
  language: string | null;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  originServer: string;
  accountMarkedAutomated: boolean;
};

export type MastodonServerView = {
  host: MastodonInstance;
  returnedCount: number;
  error: string | null;
};

export type MastodonSample = {
  post: MastodonPublicPost;
  seenVia: MastodonInstance[];
};

type ApiPost = {
  id?: string;
  url?: string | null;
  created_at?: string;
  visibility?: string;
  content?: string;
  spoiler_text?: string;
  language?: string | null;
  reblog?: unknown;
  account?: {
    display_name?: string;
    acct?: string;
    url?: string;
    bot?: boolean;
  };
};

export const MASTODON_INSTANCES = [
  { host: "mastodon.social", label: "mastodon.social" },
  { host: "mastodon.online", label: "mastodon.online" },
  { host: "mstdn.jp", label: "mstdn.jp" },
  { host: "mastodon.world", label: "mastodon.world" },
] as const;
export type MastodonInstance = (typeof MASTODON_INSTANCES)[number]["host"];

/** Read one public hashtag timeline directly from Mastodon; never persists posts. */
export async function searchPublicHashtag(
  input: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
  instance: MastodonInstance = "mastodon.social",
): Promise<MastodonPublicPost[]> {
  const hashtag = input.trim().replace(/^#+/, "");
  if (!/^[\p{L}\p{N}_-]{1,50}$/u.test(hashtag)) {
    throw new Error("Enter a hashtag with 1–50 letters, numbers, underscores, or hyphens.");
  }
  if (!MASTODON_INSTANCES.some((candidate) => candidate.host === instance)) {
    throw new Error("Choose a supported public Mastodon server.");
  }

  const response = await fetcher(
    `https://${instance}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=20`,
    { headers: { accept: "application/json" } },
  );
  if (response.status === 401) {
    throw new Error("This instance no longer allows public timeline access. No login or workaround is attempted.");
  }
  if (response.status === 404) {
    throw new Error("That hashtag is not available on this instance.");
  }
  if (response.status === 429) {
    throw new Error("Mastodon is rate-limiting requests. Try again later.");
  }
  if (!response.ok) throw new Error("The public timeline is temporarily unavailable.");

  const posts = (await response.json()) as ApiPost[];
  if (!Array.isArray(posts)) return [];

  return posts.flatMap((post) => {
    const postUrl = safeHttpsUrl(post.url);
    const authorUrl = safeHttpsUrl(post.account?.url);
    const createdAt = post.created_at ? new Date(post.created_at) : null;
    const acct = post.account?.acct;
    if (
      post.visibility !== "public" ||
      post.reblog ||
      !post.id ||
      !postUrl ||
      !authorUrl ||
      !createdAt ||
      !Number.isFinite(createdAt.getTime()) ||
      createdAt.getTime() > now ||
      !acct ||
      typeof post.content !== "string"
    ) return [];

    return [{
      id: post.id,
      url: postUrl,
      createdAt: createdAt.toISOString(),
      contentHtml: post.content,
      contentWarning: typeof post.spoiler_text === "string" ? post.spoiler_text : "",
      language: typeof post.language === "string" ? post.language : null,
      authorName: post.account?.display_name?.trim() || acct,
      authorHandle: acct,
      authorUrl,
      originServer: new URL(postUrl).hostname,
      accountMarkedAutomated: post.account?.bot === true,
    }];
  });
}

/** Compare one bounded sample per selected instance; results are never persisted. */
export async function comparePublicHashtag(
  input: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
  instances: readonly MastodonInstance[] = MASTODON_INSTANCES.map(({ host }) => host),
) {
  const uniqueInstances = [...new Set(instances)];
  if (!uniqueInstances.length || uniqueInstances.some(
    (instance) => !MASTODON_INSTANCES.some((candidate) => candidate.host === instance),
  )) {
    throw new Error("Choose one or more supported public Mastodon servers.");
  }

  const results = await Promise.all(uniqueInstances.map(async (host) => {
    try {
      return { host, posts: await searchPublicHashtag(input, fetcher, now, host), error: null };
    } catch (cause) {
      return {
        host,
        posts: [],
        error: cause instanceof Error ? cause.message : "This server view is temporarily unavailable.",
      };
    }
  }));
  const samples = new Map<string, MastodonSample>();
  for (const result of results) {
    for (const post of result.posts) {
      const sample = samples.get(post.url);
      if (sample) sample.seenVia.push(result.host);
      else samples.set(post.url, { post, seenVia: [result.host] });
    }
  }

  return {
    views: results.map(({ host, posts, error }) => ({
      host,
      returnedCount: posts.length,
      error,
    })) satisfies MastodonServerView[],
    samples: [...samples.values()],
  };
}

function safeHttpsUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
