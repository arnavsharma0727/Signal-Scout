import { searchGdeltNews } from "./gdelt-public";
import { DISCUSSION_COMMUNITIES, searchLiveDiscussion } from "./live-topic-search";
import { LEMMY_INSTANCES, LemmyInstance, searchLemmyPosts } from "./lemmy-public";
import { MASTODON_INSTANCES, searchPublicHashtag } from "./mastodon-public";
import { WIKIMEDIA_TALK_WIKIS, searchWikimediaTalk } from "./wikimedia-talk";
import { WIKINEWS_EDITIONS, searchWikinews } from "./wikinews-search";
import type { ResearchEvidence } from "./research-brief";

export type ResearchSweepSelection = {
  gdelt: boolean;
  stackExchangeSite?: string;
  lemmy: boolean;
  lemmyInstances?: readonly LemmyInstance[];
  lemmyTermsAccepted: boolean;
  mastodon?: { hashtag: string; instance: string };
  wikimediaLanguage?: string;
  wikinewsLanguage?: string;
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
  if (query.length < 2 || query.length > 100) {
    throw new Error("Enter a search phrase between 2 and 100 characters.");
  }
  if (selection.gdelt && query.length < 3) {
    throw new Error("GDELT needs at least 3 characters. Choose another source or lengthen the phrase.");
  }
  if (selection.stackExchangeSite && query.length < 3) {
    throw new Error("Stack Exchange needs at least 3 characters. Choose another source or lengthen the phrase.");
  }
  if (selection.lemmy && !selection.lemmyTermsAccepted) {
    throw new Error("Review and affirm the Lemmy instance terms and age condition before including it.");
  }
  const lemmyInstances = selection.lemmyInstances ?? [LEMMY_INSTANCES[0].host];
  if (selection.lemmy && (!lemmyInstances.length || lemmyInstances.some(
    (host) => !LEMMY_INSTANCES.some((instance) => instance.host === host),
  ))) {
    throw new Error("Choose one or more listed public Lemmy instances.");
  }
  if (!selection.gdelt && !selection.stackExchangeSite && !selection.lemmy && !selection.mastodon && !selection.wikimediaLanguage && !selection.wikinewsLanguage) {
    throw new Error("Select at least one source.");
  }
  if (selection.stackExchangeSite && !DISCUSSION_COMMUNITIES.some(({ site }) => site === selection.stackExchangeSite)) {
    throw new Error("Choose a listed Stack Exchange community.");
  }
  if (selection.wikimediaLanguage && !WIKIMEDIA_TALK_WIKIS.some(({ language }) => language === selection.wikimediaLanguage)) {
    throw new Error("Choose a listed Wikimedia language edition.");
  }
  if (selection.wikinewsLanguage && !WIKINEWS_EDITIONS.some(({ language }) => language === selection.wikinewsLanguage)) {
    throw new Error("Choose a listed Wikinews language edition.");
  }
  if (selection.mastodon && !MASTODON_INSTANCES.some(({ host }) => host === selection.mastodon!.instance)) {
    throw new Error("Choose a listed Mastodon server.");
  }

  const tasks: Promise<ResearchSweepSourceResult>[] = [];
  if (selection.gdelt) {
    tasks.push(capture("gdelt", "GDELT news index", "Indexed/seen within 7 days", async () =>
      (await searchGdeltNews(query, fetcher, now)).map((article) => ({
        id: `gdelt:${article.url}`,
        title: article.title,
        url: article.url,
        source: article.domain,
        evidenceClass: "news coverage" as const,
        language: article.language,
        timeLabel: "Indexed/seen",
        timeValue: article.seenAt,
        context: `Publisher country: ${article.sourceCountry} (outlet metadata, not audience geography)`,
        attribution: "Headline belongs to publisher; indexed by GDELT",
        attributionUrl: "https://www.gdeltproject.org/",
      })),
    ));
  }
  if (selection.stackExchangeSite) {
    const site = selection.stackExchangeSite;
    const community = DISCUSSION_COMMUNITIES.find(({ site: candidate }) => candidate === site)!;
    tasks.push(capture("stack-exchange", community.label, "Questions within 30 days", async () =>
      (await searchLiveDiscussion(query, site, fetcher, now)).map((item) => ({
        id: `stackexchange:${item.url}`,
        title: item.title,
        url: item.url,
        source: item.community,
        evidenceClass: "expert Q&A" as const,
        language: item.language,
        timeLabel: "Published",
        timeValue: item.createdAt,
        attribution: `Author: ${item.author}`,
        attributionUrl: item.authorUrl,
        licenseName: "CC BY-SA 4.0",
        licenseUrl: item.licenseUrl,
      })),
    ));
  }
  if (selection.lemmy) {
    for (const host of new Set(lemmyInstances)) {
      tasks.push(capture(`lemmy:${host}`, `Lemmy · ${host}`, "Recent posts within 7 days; up to 20 per server view", async () =>
      (await searchLemmyPosts(query, host, fetcher, now)).map((post) => ({
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
        context: `Hashtag #${hashtag.replace(/^#+/, "")}; server timeline is not a geographic market proxy`,
        attribution: `Author: ${post.authorHandle}`,
        attributionUrl: post.authorUrl,
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
      })),
    ));
  }
  if (selection.wikinewsLanguage) {
    const language = selection.wikinewsLanguage;
    const edition = WIKINEWS_EDITIONS.find(({ language: candidate }) => candidate === language)!;
    tasks.push(capture("wikinews", edition.label, "Articles updated within 30 days; up to 20", async () =>
      (await searchWikinews(query, language, fetcher, now)).map((article) => ({
        id: `wikinews:${article.url}`,
        title: article.title,
        url: article.url,
        source: article.edition,
        evidenceClass: "news coverage" as const,
        language: article.language,
        timeLabel: "Updated",
        timeValue: article.updatedAt,
        context: "Community-written news; not a general forum or population-attention measure",
        attribution: `${article.edition}; ${article.license}`,
        attributionUrl: article.licenseUrl,
        licenseName: article.license,
        licenseUrl: article.licenseUrl,
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
