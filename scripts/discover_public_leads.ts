import { fetchBlueskyTrends } from "../apps/web/lib/bluesky-trends";
import { searchBlueskyPosts } from "../apps/web/lib/bluesky-public";
import { DISCUSSION_COMMUNITIES, searchLiveDiscussion } from "../apps/web/lib/live-topic-search";
import { GlobalVoicesConnector } from "../apps/web/lib/connectors/global-voices";
import { TheConversationConnector } from "../apps/web/lib/connectors/the-conversation";
import { buildPublicLeadSeeds, classifyPublicDiscussionPost } from "../apps/web/lib/public-lead-discovery";

/**
 * Keyless, bounded discovery run. Live provider trends supply query seeds; the
 * APIs return only citations/metadata. The output is a review queue, never a
 * published/qualified lead: only a researcher can attest claim-level support,
 * contradiction, alternatives, and original-source review.
 */
const MAX_TOPICS = 8;
const MAX_API_CONCURRENCY = 4;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

type Citation = {
  source: string;
  sourceClass: "public social post" | "expert Q&A" | "licensed reporting" | "licensed analysis";
  operator: string;
  title: string;
  url: string;
  publishedAt: string;
  attribution: string;
  license?: string;
  conversationRole?: "non-headline" | "headline-echo" | "link-only";
};

type TopicResult = {
  topic: string;
  discovery: {
    seedSource: "researcher query" | "Bluesky provider trend" | "reviewed publisher headline";
    category: string | null;
    providerPostCount: number | null;
    sourceTitle?: string;
    sourceUrl?: string;
  };
  citations: Citation[];
  coverage: {
    socialPosts: number;
    nonHeadlineAuthors: number;
    headlineEchoPosts: number;
    linkOnlyPosts: number;
    licensedQuestions: number;
    reviewedNewsOperators: string[];
  };
  state: "candidate_for_original_source_review" | "insufficient_cross_source_evidence" | "provider_error";
  qualificationGaps: string[];
  triageNotes: string[];
  errors: string[];
};

async function main() {
  const researcherQueries = readResearcherQueries(process.argv.slice(2));
  const trends = await fetchBlueskyTrends();
  const feeds = await fetchReviewedFeeds();
  const topics = buildPublicLeadSeeds(trends, feeds.documents.map((document) => ({
    title: document.titleOriginal,
    url: document.sourceUrl,
    publishedAt: document.publishedAt ?? "",
  })), Date.now(), researcherQueries).slice(0, MAX_TOPICS);

  if (!topics.length) {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: "researcher/provider/publisher-seeded; bounded API cross-checks",
      status: "no_current_provider_trends",
      candidates: [],
      limitations: limitations(),
    }, null, 2) + "\n");
    return;
  }

  const candidates = await mapLimit(topics, MAX_API_CONCURRENCY, async (trend) =>
    discoverTopic(trend, feeds.documents, feeds.errors),
  );
  candidates.sort((a, b) => rank(b) - rank(a) || a.topic.localeCompare(b.topic));

  process.stdout.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "researcher/provider/publisher-seeded; bounded API cross-checks",
    status: "complete",
    providers: [
      { name: "Bluesky public trends + search", authentication: "none", role: "query discovery and public conversation" },
      { name: "Stack Exchange API v2.3", authentication: "none", role: "recent CC BY-SA 4.0 expert-Q&A titles and attribution" },
      { name: "Global Voices licensed RSS", authentication: "none", role: "current international reporting headlines with feed-verified attribution and rights" },
      { name: "The Conversation licensed Atom feeds", authentication: "none", role: "current expert-analysis headlines with feed-verified attribution and rights" },
    ],
    candidates,
    limitations: limitations(),
  }, null, 2) + "\n");
}

async function discoverTopic(
  trend: ReturnType<typeof buildPublicLeadSeeds>[number],
  publisherDocuments: Awaited<ReturnType<typeof fetchReviewedFeeds>>["documents"],
  feedErrors: string[],
): Promise<TopicResult> {
  const errors: string[] = [];
  const triageNotes: string[] = [];
  const citations: Citation[] = [];
  const query = trend.topic.trim();
  const community = chooseCommunity(query);

  const [social, questions, news] = await Promise.allSettled([
    searchBlueskyPosts(query),
    community ? searchLiveDiscussion(query.slice(0, 80), community.site) : Promise.resolve([]),
    Promise.resolve(publisherDocuments.filter((document) => matchesHeadline(query, document.titleOriginal))),
  ]);

  if (social.status === "fulfilled") {
    const matchedHeadlines = publisherDocuments
      .filter((document) => matchesHeadline(query, document.titleOriginal))
      .map((document) => document.titleOriginal);
    const classifiedPosts = social.value.map((post) => ({
      post,
      role: classifyPublicDiscussionPost(post.transientPreview, matchedHeadlines),
    }));
    const nonHeadlinePosts = classifiedPosts.filter(({ role }) => role === "non-headline");
    const echoes = classifiedPosts.filter(({ role }) => role === "headline-echo");
    const linkOnly = classifiedPosts.filter(({ role }) => role === "link-only");
    const nonHeadlineAuthors = new Set(nonHeadlinePosts.map(({ post }) => post.authorHandle));
    const selectedPosts = [
      ...nonHeadlinePosts.slice(0, 4),
      ...echoes.slice(0, Math.max(0, 4 - Math.min(nonHeadlinePosts.length, 4))),
      ...linkOnly.slice(0, Math.max(0, 4 - Math.min(nonHeadlinePosts.length + echoes.length, 4))),
    ].slice(0, 4);
    for (const { post, role } of selectedPosts) citations.push({
      source: "Bluesky public search",
      sourceClass: "public social post",
      operator: "Bluesky",
      title: post.title,
      url: post.url,
      publishedAt: post.publishedAt,
      attribution: `@${post.authorHandle}`,
      conversationRole: role,
    });
    triageNotes.push(...(nonHeadlineAuthors.size < 2
      ? ["Bluesky: fewer than two distinct authors posted text beyond a matched publisher headline or link."]
      : []));
    if (echoes.length) triageNotes.push(`Bluesky: ${echoes.length} result(s) repeat a matched publisher headline and are excluded from the non-headline author count.`);
    if (linkOnly.length) triageNotes.push(`Bluesky: ${linkOnly.length} result(s) contain only links and are excluded from the non-headline author count.`);
  } else errors.push(`Bluesky: ${message(social.reason)}`);

  if (questions.status === "fulfilled") {
    for (const item of questions.value.slice(0, 4)) citations.push({
      source: item.community,
      sourceClass: "expert Q&A",
      operator: "Stack Exchange",
      title: item.title,
      url: item.url,
      publishedAt: item.createdAt,
      attribution: item.author,
      license: "CC BY-SA 4.0",
    });
  } else errors.push(`Stack Exchange: ${message(questions.reason)}`);

  if (news.status === "rejected") errors.push(`Licensed publisher feeds: ${message(news.reason)}`);
  errors.push(...feedErrors);
  const reviewedNews = news.status === "fulfilled" ? news.value : [];
  for (const item of reviewedNews.slice(0, 6)) citations.push({
    source: item.sourceName,
    sourceClass: item.sourceType === "licensed-reporting" ? "licensed reporting" : "licensed analysis",
    operator: String(item.rawMetadata.publisher ?? item.sourceName),
    title: item.titleOriginal,
    url: item.sourceUrl,
    publishedAt: item.publishedAt ?? "",
    attribution: typeof item.rawMetadata.author === "string"
      ? item.rawMetadata.author
      : Array.isArray(item.rawMetadata.authors) ? item.rawMetadata.authors.join(", ") : item.sourceName,
    license: typeof item.rawMetadata.licenseName === "string" ? item.rawMetadata.licenseName : "Creative Commons; see source attribution",
  });

  const socialCount = social.status === "fulfilled" ? social.value.length : 0;
  const matchedHeadlines = publisherDocuments
    .filter((document) => matchesHeadline(query, document.titleOriginal))
    .map((document) => document.titleOriginal);
  const classifiedSocial = social.status === "fulfilled"
    ? social.value.map((post) => classifyPublicDiscussionPost(post.transientPreview, matchedHeadlines))
    : [];
  const nonHeadlineAuthors = social.status === "fulfilled"
    ? new Set(social.value.filter((post) => classifyPublicDiscussionPost(post.transientPreview, matchedHeadlines) === "non-headline")
      .map((post) => post.authorHandle)).size
    : 0;
  const questionCount = questions.status === "fulfilled" ? questions.value.length : 0;
  const newsOperators = [...new Set(reviewedNews.map((item) => String(item.rawMetadata.publisher ?? item.sourceName)))];
  const enoughCoverage = (nonHeadlineAuthors >= 2 || questionCount > 0) && newsOperators.length > 0;
  const providerError = social.status === "rejected" && questions.status === "rejected" && news.status === "rejected";
  return {
    topic: query,
    discovery: {
      seedSource: trend.source,
      category: trend.category,
      providerPostCount: trend.providerPostCount,
      ...(trend.sourceTitle ? { sourceTitle: trend.sourceTitle } : {}),
      ...(trend.sourceUrl ? { sourceUrl: trend.sourceUrl } : {}),
    },
    citations,
    coverage: {
      socialPosts: socialCount,
      nonHeadlineAuthors,
      headlineEchoPosts: classifiedSocial.filter((role) => role === "headline-echo").length,
      linkOnlyPosts: classifiedSocial.filter((role) => role === "link-only").length,
      licensedQuestions: questionCount,
      reviewedNewsOperators: newsOperators,
    },
    state: providerError ? "provider_error" : enoughCoverage ? "candidate_for_original_source_review" : "insufficient_cross_source_evidence",
    qualificationGaps: [
      "A researcher query, provider trend, or publisher headline is a search seed—not a representative or geographic measure.",
      "Bluesky search returns a mix of individual posts, media relays, and institutional accounts; hits are not necessarily conversation.",
      ...(nonHeadlineAuthors < 2 ? ["Fewer than two distinct Bluesky authors posted text beyond matched publisher headlines or links; original-source review is still needed to establish relevant conversation."] : []),
      "Non-headline text is a lexical triage signal only; it may be unrelated, copied, institutional, or non-substantive.",
      ...(classifiedSocial.some((role) => role === "headline-echo") ? ["Headline-echo results are listed for context but excluded from the non-headline author count."] : []),
      "A researcher must open each original source and write claim-specific supporting and contradictory observations.",
      "The output does not infer sentiment, causality, market impact, or a buy/sell conclusion.",
      "At least two independent reviewed operators, a credible alternative explanation, and a disconfirmation test must be documented before publication.",
      "Publisher coverage is limited to current items in the reviewed Global Voices and The Conversation feeds; it is not a general news census.",
    ],
    triageNotes,
    errors,
  };
}

async function fetchReviewedFeeds() {
  const now = new Date();
  const input = { query: "current trend validation", start: new Date(now.getTime() - LOOKBACK_MS), end: now, marketCode: "INTL" };
  const results = await Promise.allSettled([
    new GlobalVoicesConnector().fetchDocuments(input),
    new TheConversationConnector().fetchDocuments(input),
  ]);
  const documents = results.flatMap((result) => result.status === "fulfilled" ? result.value.documents : []);
  const errors = results.flatMap((result, index) => result.status === "rejected"
    ? [`${index === 0 ? "Global Voices" : "The Conversation"} feed unavailable: ${message(result.reason)}`]
    : []);
  return { documents, errors };
}

function matchesHeadline(topic: string, headline: string) {
  const stopWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "week"]);
  const tokens = (value: string) => value.normalize("NFKC").toLocaleLowerCase()
    .match(/[\p{L}\p{N}]{3,}/gu)?.filter((word) => !stopWords.has(word)) ?? [];
  const terms = [...new Set(tokens(topic))];
  if (!terms.length) return false;
  const title = new Set(tokens(headline));
  const matched = terms.filter((term) => title.has(term)).length;
  return matched >= Math.min(2, terms.length) && matched / terms.length >= 0.6;
}

function chooseCommunity(topic: string) {
  const value = topic.toLocaleLowerCase();
  if (/stock|market|finance|bank|currency|inflation|econom|tariff|trade|rate|housing|energy/.test(value))
    return DISCUSSION_COMMUNITIES.find(({ site }) => site === "economics")!;
  if (/literature|novel|poet|poetry|author|book|nobel/.test(value))
    return DISCUSSION_COMMUNITIES.find(({ site }) => site === "literature")!;
  if (/ai|artificial intelligence|machine learning|data cent(?:er|re)|datacenter|firmus|chip|semiconductor/.test(value))
    return DISCUSSION_COMMUNITIES.find(({ site }) => site === "ai")!;
  if (/security|privacy|cyber|hack/.test(value))
    return DISCUSSION_COMMUNITIES.find(({ site }) => site === "security")!;
  if (/election|congress|government|senator|president|court|visa|immigration|war|policy|law/.test(value))
    return DISCUSSION_COMMUNITIES.find(({ site }) => site === "politics")!;
  return undefined;
}

function rank(candidate: TopicResult) {
  return (candidate.state === "candidate_for_original_source_review" ? 100 : 0) +
    Number(candidate.coverage.nonHeadlineAuthors >= 2) * 10 +
    Number(candidate.coverage.licensedQuestions > 0) * 10 +
    candidate.coverage.reviewedNewsOperators.length * 10;
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      try {
        output[index] = await task(items[index]);
      } catch (cause) {
        const trend = items[index] as unknown as Awaited<ReturnType<typeof fetchBlueskyTrends>>[number];
        output[index] = {
          topic: trend.topic,
        discovery: {
          seedSource: trend.source,
          category: trend.category,
          providerPostCount: trend.providerPostCount,
          ...(trend.sourceTitle ? { sourceTitle: trend.sourceTitle } : {}),
          ...(trend.sourceUrl ? { sourceUrl: trend.sourceUrl } : {}),
        },
          citations: [],
          coverage: { socialPosts: 0, nonHeadlineAuthors: 0, headlineEchoPosts: 0, linkOnlyPosts: 0, licensedQuestions: 0, reviewedNewsOperators: [] },
          state: "provider_error",
          qualificationGaps: limitations(),
          triageNotes: [],
          errors: [message(cause)],
        } as R;
      }
    }
  }));
  return output;
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Provider request failed.";
}

function readResearcherQueries(args: string[]) {
  const topics: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--topic" && args[index + 1]) {
      topics.push(args[++index].trim());
      continue;
    }
    if (args[index] === "--help") {
      process.stdout.write("Usage: npm run discover:leads -- [--topic \"specific event or entity\"]...\\n");
      process.exit(0);
    }
    throw new Error(`Unknown or incomplete option: ${args[index]}`);
  }
  if (topics.some((topic) => topic.length < 2 || topic.length > 100)) {
    throw new Error("Each --topic value must contain 2–100 characters.");
  }
  return [...new Set(topics.map((topic) => topic.normalize("NFKC").toLocaleLowerCase()))]
    .map((normalized) => topics.find((topic) => topic.normalize("NFKC").toLocaleLowerCase() === normalized)!)
    .slice(0, 4);
}

function limitations() {
  return [
    "No credentials, scraping, login bypass, or page-body retention: only documented public APIs and rights-reviewed feed connectors are called.",
    "This bounded run checks at most eight provider-ranked topics and is not exhaustive.",
    "Provider search indexes and trend lists are partial, query-selected samples; counts are not public attention or population estimates.",
    "Social search hits can include media relays and institutional accounts rather than person-to-person discussion.",
    "Automated discovery creates review candidates only. It cannot attest that evidence supports or contradicts a thesis.",
  ];
}

void main().catch((cause) => {
  process.stderr.write(`Discovery failed: ${message(cause)}\n`);
  process.exitCode = 1;
});
