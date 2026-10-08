import { searchBlueskyPosts } from "./bluesky-public";
import { searchHackerNewsComments } from "./hacker-news-search";
import type { GlobalVoicesEditionResult } from "./global-voices-search";
import { DISCUSSION_COMMUNITIES, searchLiveDiscussion } from "./live-topic-search";
import { LEMMY_INSTANCES, LemmyInstance, searchLemmyPosts } from "./lemmy-public";
import { MASTODON_INSTANCES, mastodonHtmlToTransientText, searchPublicHashtag } from "./mastodon-public";
import { WIKIMEDIA_TALK_WIKIS, searchWikimediaTalk } from "./wikimedia-talk";
import type { ResearchEvidence } from "./research-brief";

export type ResearchSweepSelection = {
  /** Kept for backwards-compatible callers; GDELT is retired from live search. */
  gdelt?: boolean;
  hackerNews?: boolean;
  globalVoices?: boolean;
  stackExchangeSite?: string;
  stackExchangeQueries?: readonly { site: string; query: string }[];
  lemmy: boolean;
  lemmyInstances?: readonly LemmyInstance[];
  /** Visitor-supplied local-language query for each selected instance; never translated or pooled. */
  lemmyQueries?: readonly { host: LemmyInstance; query: string }[];
  lemmyTermsAccepted: boolean;
  mastodon?: { hashtag: string; instance: string };
  mastodonTermsAccepted?: boolean;
  bluesky?: boolean;
  /** Visitor-supplied language variants stay separate; no translation or pooling. */
  blueskyQueries?: readonly string[];
  wikimediaLanguage?: string;
};

export type ResearchSweepSourceResult = {
  key: string;
  label: string;
  window: string;
  evidence: ResearchEvidence[];
  error: string | null;
};

/**
 * Run bounded, visitor-triggered searches directly from the browser.
 * Provider counts/windows remain separate; this never scores or stores results.
 */
export async function runResearchSweep(
  input: string,
  selection: ResearchSweepSelection,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<ResearchSweepSourceResult[]> {
  const query = input.trim();
  const stackExchangeQueries = selection.stackExchangeQueries ?? (selection.stackExchangeSite
    ? [{ site: selection.stackExchangeSite, query }]
    : []);
  const blueskyQueries = selection.bluesky
    ? selection.blueskyQueries ?? [query]
    : [];
  if (query.length < 2 || query.length > 100) {
    throw new Error("Enter a search phrase between 2 and 100 characters.");
  }
  if (stackExchangeQueries.length > 4) throw new Error("Choose no more than four Stack Exchange communities per sweep.");
  if (new Set(stackExchangeQueries.map(({ site }) => site)).size !== stackExchangeQueries.length) {
    throw new Error("Choose each Stack Exchange community only once.");
  }
  if (stackExchangeQueries.some(({ site, query: term }) =>
    !DISCUSSION_COMMUNITIES.some((community) => community.site === site) ||
    term.trim().length < 3 || term.trim().length > 80,
  )) throw new Error("Each Stack Exchange community needs a listed site and its own 3–80 character search phrase.");
  if (blueskyQueries.length > 3) throw new Error("Choose no more than three separate Bluesky language phrases.");
  if (blueskyQueries.some((term) => term.trim().length < 2 || term.trim().length > 100)) {
    throw new Error("Each Bluesky phrase must contain 2–100 characters.");
  }
  if (new Set(blueskyQueries.map((term) => term.trim().normalize("NFKC").toLocaleLowerCase())).size !== blueskyQueries.length) {
    throw new Error("Use a different phrase for each Bluesky language search.");
  }
  if (selection.lemmy && !selection.lemmyTermsAccepted) {
    throw new Error("Review and affirm the Lemmy instance terms and age condition before including it.");
  }
  const lemmyInstances = selection.lemmyInstances ?? [LEMMY_INSTANCES[0].host];
  if (selection.lemmy && (!lemmyInstances.length || lemmyInstances.some(
    (host) => !LEMMY_INSTANCES.some((instance) => instance.host === host),
  ) || lemmyInstances.length > 4)) {
    throw new Error("Choose one to four listed public Lemmy instances.");
  }
  if (selection.lemmy && selection.lemmyQueries) {
    if (selection.lemmyQueries.length !== new Set(lemmyInstances).size ||
      new Set(selection.lemmyQueries.map(({ host }) => host)).size !== selection.lemmyQueries.length ||
      lemmyInstances.some((host) => !selection.lemmyQueries!.some((item) => item.host === host)) ||
      selection.lemmyQueries.some(({ query: term }) => term.trim().length < 2 || term.trim().length > 100)) {
      throw new Error("Provide one 2–100 character search phrase for every selected Lemmy instance.");
    }
  }
  if (!selection.hackerNews && !selection.globalVoices && !stackExchangeQueries.length && !selection.lemmy && !selection.mastodon && !blueskyQueries.length && !selection.wikimediaLanguage) {
    throw new Error("Select at least one source.");
  }
  if (selection.wikimediaLanguage && !WIKIMEDIA_TALK_WIKIS.some(({ language }) => language === selection.wikimediaLanguage)) {
    throw new Error("Choose a listed Wikimedia language edition.");
  }
  if (selection.mastodon && !MASTODON_INSTANCES.some(({ host }) => host === selection.mastodon!.instance)) {
    throw new Error("Choose a listed Mastodon server.");
  }
  if (selection.mastodon && !selection.mastodonTermsAccepted) {
    throw new Error("Review the selected Mastodon server's rules and privacy information before searching.");
  }

  const tasks: Promise<ResearchSweepSourceResult>[] = [];
  if (selection.hackerNews) {
    tasks.push(capture("hacker-news", "Hacker News · tech community", "Relevant comments from the last 30 days · up to 20", async () =>
      (await searchHackerNewsComments(query, fetcher, now)).map((item) => ({
        id: `hacker-news:${item.id}`,
        title: item.title,
        url: item.url,
        source: "Hacker News",
        evidenceClass: "social discussion" as const,
        language: "English",
        timeLabel: "Published",
        timeValue: item.createdAt,
        transientPreview: item.transientPreview,
        attribution: `Author: ${item.author}`,
        sourceOperatorKey: "hacker-news",
        sourceOperatorLabel: "Hacker News",
        context: "An English-language technology community; not a cross-country or general-population sample",
      })),
    ));
  }
  if (selection.globalVoices) {
    tasks.push((async () => {
      const key = "global-voices";
      const label = "Global Voices · multilingual reporting";
      try {
        const response = await fetcher("/api/research/global-voices", {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!response.ok) throw new Error(response.status === 429
          ? "Global Voices search limit reached. Try again in one minute."
          : "Global Voices search is temporarily unavailable.");
        const body = await response.json() as { editions?: GlobalVoicesEditionResult[] };
        if (!Array.isArray(body.editions)) throw new Error("Global Voices returned an unexpected response.");
        const available = body.editions.filter(({ error }) => !error);
        if (!available.length) throw new Error("All Global Voices language editions are temporarily unavailable.");
        const evidence = available.flatMap(({ edition, language, articles }) => articles.map((article) => ({
          id: `global-voices:${article.id}`,
          title: article.title,
          url: article.url,
          source: `Global Voices · ${edition} edition`,
          evidenceClass: "news coverage" as const,
          language,
          timeLabel: "Published",
          timeValue: article.publishedAt,
          context: "The provider may match article text even when the headline omits the phrase; edition language does not identify the people or audience represented",
          attribution: "Global Voices headline",
          attributionUrl: "https://globalvoices.org/about/global-voices-attribution-policy/",
          sourceOperatorKey: "global-voices",
          sourceOperatorLabel: "Global Voices",
        })));
        return {
          key,
          label,
          window: `${available.length}/${body.editions.length} editions · last 30 days · provider may match story text; headline shown`,
          evidence,
          error: null,
        };
      } catch (cause) {
        return { key, label, window: "Localized edition search · last 30 days · headline metadata shown", evidence: [], error: cause instanceof Error ? cause.message : "Global Voices search is unavailable." };
      }
    })());
  }
  for (const { site, query: termInput } of stackExchangeQueries) {
    const term = termInput.trim();
    const community = DISCUSSION_COMMUNITIES.find(({ site: candidate }) => candidate === site)!;
    tasks.push(capture(`stack-exchange:${site}`, community.label, `Title matches within 30 days · query: ${term}`, async () =>
      (await searchLiveDiscussion(term, site, fetcher, now)).map((item) => ({
        id: `stackexchange:${item.url}`,
        title: item.title,
        url: item.url,
        source: item.community,
        evidenceClass: "expert Q&A" as const,
        language: item.language,
        timeLabel: "Published",
        timeValue: item.createdAt,
        context: `Stack Exchange title search in ${item.language}; title-only query, not topic prevalence`,
        attribution: `Author: ${item.author}`,
        attributionUrl: item.authorUrl,
        licenseName: "CC BY-SA 4.0",
        licenseUrl: item.licenseUrl,
        sourceOperatorKey: "stack-exchange",
        sourceOperatorLabel: "Stack Exchange",
      })),
    ));
  }
  if (selection.lemmy) {
    for (const host of new Set(lemmyInstances)) {
      const term = selection.lemmyQueries?.find((item) => item.host === host)?.query.trim() ?? query;
      tasks.push(capture(`lemmy:${host}`, `Lemmy · ${host}`, "Recent posts within 7 days; up to 20 per server view", async () =>
      (await searchLemmyPosts(term, host, fetcher, now)).map((post) => ({
        id: `lemmy:${post.url}`,
        title: post.title,
        url: post.url,
        source: `Lemmy · ${host} / c/${post.community}`,
        evidenceClass: "social discussion" as const,
        language: post.languageId === null ? "not provided" : `Lemmy language id ${post.languageId}`,
        timeLabel: "Published",
        timeValue: post.publishedAt,
        attribution: `Lemmy author: ${post.author}`,
        attributionUrl: post.authorUrl ?? post.url,
        // Treat federated instance searches as one Lemmy source class; multiple instances can overlap.
        sourceOperatorKey: "lemmy-federation",
        sourceOperatorLabel: "Lemmy federated search",
        transientPreview: post.transientPreview,
      })),
      ));
    }
  }
  if (selection.mastodon) {
    const { hashtag, instance } = selection.mastodon;
    const server = MASTODON_INSTANCES.find(({ host }) => host === instance)!;
    tasks.push(capture("mastodon", `Mastodon · ${server.label}`, "Up to 20 newest public hashtag posts", async () =>
      (await searchPublicHashtag(hashtag, fetcher, now, server.host)).map((post) => ({
        id: `mastodon:${post.url}`,
        title: `Public post by @${post.authorHandle}`,
        url: post.url,
        source: `Mastodon · ${post.originServer} via ${server.host}`,
        evidenceClass: "social discussion" as const,
        language: post.language ?? "not provided",
        timeLabel: "Published",
        timeValue: post.createdAt,
        context: post.contentWarning
          ? `Content warning: ${post.contentWarning.slice(0, 200)}; preview withheld, open the original post if appropriate`
          : "Public hashtag search; server timeline is not a geographic market proxy",
        attribution: `Author: ${post.authorHandle}`,
        attributionUrl: post.authorUrl,
        // The selected server is the query operator; multiple Mastodon servers are one network class.
        sourceOperatorKey: "mastodon-network",
        sourceOperatorLabel: "Mastodon public instances",
        transientPreview: post.contentWarning ? undefined : mastodonHtmlToTransientText(post.contentHtml),
      })),
    ));
  }
  for (const [index, termInput] of blueskyQueries.entries()) {
    const term = termInput.trim();
    tasks.push(capture(`bluesky:${index}`, `Bluesky · search ${index + 1}`, `Up to 25 newest indexed posts within 7 days · query: ${term}`, async () =>
      (await searchBlueskyPosts(term, fetcher, now)).map((post) => ({
        id: `bluesky:${post.uri}`,
        title: post.title,
        url: post.url,
        source: `Bluesky public AppView · search ${index + 1}`,
        evidenceClass: "social discussion" as const,
        language: post.language,
        timeLabel: "Published",
        timeValue: post.publishedAt,
        sourceOperatorKey: "bluesky",
        sourceOperatorLabel: "Bluesky",
        transientPreview: post.transientPreview,
        context: "Visitor-entered language variants are kept as separate searches and are not translated or pooled; indexed subset, not a complete or representative feed",
        attribution: `Author: @${post.authorHandle}`,
      })),
    ));
  }
  if (selection.wikimediaLanguage) {
    const language = selection.wikimediaLanguage;
    const wiki = WIKIMEDIA_TALK_WIKIS.find(({ language: candidate }) => candidate === language)!;
    tasks.push(capture("wikimedia", wiki.wiki, "Talk pages edited within 90 days; up to 20", async () =>
      (await searchWikimediaTalk(query, language, fetcher, now)).map((page) => ({
        id: `wikimedia-talk:${page.url}`,
        title: page.title,
        url: page.url,
        source: page.wiki,
        evidenceClass: "editorial discussion" as const,
        language: page.language,
        timeLabel: "Last edited",
        timeValue: page.lastEditedAt,
        context: "Article talk page; collaborative editorial discussion, not a general forum",
        attribution: "View page history and contributors",
        attributionUrl: page.historyUrl,
        sourceOperatorKey: "wikimedia",
        sourceOperatorLabel: "Wikimedia projects",
      })),
    ));
  }
  return Promise.all(tasks);
}

async function capture(
  key: ResearchSweepSourceResult["key"],
  label: string,
  window: string,
  search: () => Promise<ResearchEvidence[]>,
): Promise<ResearchSweepSourceResult> {
  try {
    return { key, label, window, evidence: await search(), error: null };
  } catch (cause) {
    return {
      key,
      label,
      window,
      evidence: [],
      error: cause instanceof Error ? cause.message : "This source is temporarily unavailable.",
    };
  }
}
