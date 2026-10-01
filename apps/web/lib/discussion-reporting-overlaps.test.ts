import { describe, expect, it } from "vitest";
import { buildDiscussionReportingOverlaps, OverlapInput } from "./discussion-reporting-overlaps";

const asOf = new Date("2026-10-01T12:00:00Z");
function row(overrides: Partial<OverlapInput> = {}): OverlapInput {
  return {
    id: "q1",
    source_type: "stack-exchange",
    source_name: "Economics Stack Exchange",
    source_domain: "api.stackexchange.com",
    language_code: "en",
    title_original: "Central bank interest rate outlook",
    source_url: "https://economics.stackexchange.com/questions/1",
    published_at: "2026-10-01T11:00:00Z",
    raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["central-bank"], query: "central bank" },
    ...overrides,
  };
}

describe("discussion-reporting literal overlaps", () => {
  it("links exact same-language Q&A tags to licensed reporting headlines with original sources", () => {
    const overlap = buildDiscussionReportingOverlaps([
      row(),
      row({ id: "r1", source_type: "licensed-reporting", source_name: "Global Voices", source_domain: "globalvoices.org", title_original: "Central bank weighs new measures", source_url: "https://globalvoices.org/story", raw_metadata_json: {} }),
    ], asOf);
    expect(overlap).toHaveLength(2);
    const tagOverlap = overlap.find(({ matchBasis }) => matchBasis === "community tag");
    const queryOverlap = overlap.find(({ matchBasis }) => matchBasis === "scheduled search phrase");
    expect(tagOverlap).toMatchObject({
      phrase: "central-bank",
      language: "en",
      discussionItemCount: 1,
      discussionSources: ["Economics Stack Exchange"],
      reportingSources: ["Global Voices"],
    });
    expect(queryOverlap).toMatchObject({ phrase: "central bank", discussionItemCount: 1 });
    expect(tagOverlap!.discussions[0].url).toContain("stackexchange.com/questions/1");
    expect(tagOverlap!.reporting[0].url).toBe("https://globalvoices.org/story");
  });

  it("uses the source-applied tag even when the tag words are absent from the question title", () => {
    const question = row({
      title_original: "Will this affect future savings?",
      raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["central-bank"], query: "future savings" },
    });
    const report = row({
      id: "r-tag-only",
      source_type: "licensed-reporting",
      source_name: "Global Voices",
      source_domain: "globalvoices.org",
      title_original: "Central bank weighs new measures",
      source_url: "https://globalvoices.org/tag-only",
      raw_metadata_json: {},
    });
    expect(buildDiscussionReportingOverlaps([question, report], asOf)).toHaveLength(1);
  });

  it("matches attributed Fedora title phrases to exact same-language reporting phrases", () => {
    const forum = row({
      id: "fedora-1", source_type: "licensed-forum",
      source_name: "Fedora Discussion · community forum",
      source_domain: "discussion.fedoraproject.org", language_code: "en",
      title_original: "Nuclear fusion debate",
      source_url: "https://discussion.fedoraproject.org/t/workstation/123",
      raw_metadata_json: {
        publisher: "Fedora Discussion", author: "member",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        titleUnmodified: true, topicBodyAndRepliesDiscarded: true,
        profileDetailsDiscarded: true,
      },
    });
    const report = row({
      id: "gv-hardware", source_type: "licensed-reporting", source_name: "Global Voices",
      source_domain: "globalvoices.org", title_original: "Nuclear fusion attracts new investment",
      source_url: "https://globalvoices.org/hardware", raw_metadata_json: {},
    });
    const overlaps = buildDiscussionReportingOverlaps([forum, report], asOf);
    const exactPhrase = overlaps.find(({ phrase }) => phrase === "nuclear fusion");
    expect(exactPhrase).toMatchObject({
      phrase: "nuclear fusion", matchBasis: "literal topic-title phrase", discussionItemCount: 1,
      discussionSources: ["Fedora Discussion · community forum"],
      discussions: [{ url: forum.source_url }], reporting: [{ url: report.source_url }],
    });
  });

  it("does not treat an unreviewed forum or wrong license as discussion evidence", () => {
    const report = row({
      id: "report", source_type: "licensed-reporting", source_name: "Global Voices",
      source_domain: "globalvoices.org", title_original: "Nuclear fusion research", raw_metadata_json: {},
    });
    const unreviewed = row({
      id: "unreviewed", source_type: "licensed-forum", source_domain: "unknown.example",
      title_original: "Nuclear fusion debate",
      raw_metadata_json: { publisher: "Unknown" },
    });
    const wrongLicense = row({
      id: "wrong-license", source_type: "licensed-forum", source_domain: "discussion.fedoraproject.org",
      raw_metadata_json: {
        publisher: "Fedora Discussion", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        titleUnmodified: true, topicBodyAndRepliesDiscarded: true,
        profileDetailsDiscarded: true,
      },
    });
    expect(buildDiscussionReportingOverlaps([unreviewed, wrongLicense, report], asOf)).toEqual([]);
  });

  it("labels scheduled search phrases separately from community-applied tags", () => {
    const question = row({
      title_original: "Interest rate outlook",
      raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["economics"], query: "interest rate" },
    });
    const report = row({
      id: "r-query",
      source_type: "licensed-analysis",
      source_name: "The Conversation",
      source_domain: "theconversation.com",
      title_original: "Interest rate outlook across global markets",
      source_url: "https://theconversation.com/interest-rate",
      raw_metadata_json: {},
    });
    expect(buildDiscussionReportingOverlaps([question, report], asOf)).toContainEqual(expect.objectContaining({
      phrase: "interest rate",
      matchBasis: "scheduled search phrase",
      discussionItemCount: 1,
    }));
  });

  it("suppresses ambiguous acronym-only phrases such as AI, GPU, and LLM", () => {
    const question = row({
      title_original: "Artificial intelligence adoption in financial services",
      raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["machine-learning"], query: "AI" },
    });
    const headlines = ["AI policy needs to catch up", "GPU exports face new rules", "LLM safety debate"].map((title, index) => row({
      id: `r-short-${index}`,
      source_type: "licensed-analysis",
      source_name: "The Conversation",
      source_domain: "theconversation.com",
      title_original: title,
      source_url: `https://theconversation.com/short-${index}`,
      raw_metadata_json: {},
    }));
    expect(buildDiscussionReportingOverlaps([question, ...headlines], asOf)).toEqual([]);
  });

  it("keeps fully spelled phrases as exact, query-selected cross-source cues", () => {
    const question = row({
      title_original: "Artificial intelligence adoption in financial services",
      raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["machine-learning"], query: "artificial intelligence" },
    });
    const headline = row({
      id: "r-phrase", source_type: "licensed-analysis", source_name: "The Conversation",
      source_domain: "theconversation.com", title_original: "Artificial intelligence use in banking",
      source_url: "https://theconversation.com/artificial-intelligence", raw_metadata_json: {},
    });
    expect(buildDiscussionReportingOverlaps([question, headline], asOf)).toContainEqual(expect.objectContaining({
      phrase: "artificial intelligence", matchBasis: "scheduled search phrase",
    }));
  });

  it("does not bridge languages, partial words, unlicensed Q&A, excluded sources, or stale rows", () => {
    const reports = [
      row({ id: "r-en", source_type: "licensed-analysis", source_name: "The Conversation", source_domain: "theconversation.com", title_original: "Central bank decisions", source_url: "https://theconversation.com/story", raw_metadata_json: {} }),
      row({ id: "r-es", source_type: "licensed-reporting", source_name: "Spanish outlet", language_code: "es", title_original: "Banco central decide", source_url: "https://news.example/story", raw_metadata_json: {} }),
      row({ id: "r-partial", source_type: "licensed-reporting", source_name: "Partial match", title_original: "Central bankers debate policy", source_url: "https://news.example/partial", raw_metadata_json: {} }),
      row({ id: "r-old", source_type: "licensed-reporting", source_name: "Old report", title_original: "Central bank decision", published_at: "2026-09-20T00:00:00Z", source_url: "https://news.example/old", raw_metadata_json: {} }),
      row({ id: "r-hn", source_type: "hacker-news", source_name: "Hacker News", title_original: "Central bank discussion", source_domain: "news.ycombinator.com", source_url: "https://news.ycombinator.com/item?id=1", raw_metadata_json: {} }),
    ];
    const invalidQuestion = row({ id: "q-unlicensed", raw_metadata_json: { contentLicense: "CC BY-NC-SA 4.0", tags: ["central-bank"], query: "central bank" } });
    expect(buildDiscussionReportingOverlaps([invalidQuestion, ...reports], asOf)).toEqual([]);
    const literalOnly = row({ id: "q-literal" });
    const partialHeadline = row({ id: "r-only-partial", source_type: "licensed-reporting", source_name: "Partial outlet", title_original: "Central bankers debate policy", source_url: "https://news.example/partial-only", raw_metadata_json: {} });
    expect(buildDiscussionReportingOverlaps([literalOnly, partialHeadline], asOf)).toEqual([]);
  });

  it("deduplicates source items and exposes no generated thesis or sentiment", () => {
    const q1 = row();
    const q2 = row({ id: "q2", source_name: "Money Stack Exchange", source_url: "https://money.stackexchange.com/questions/2" });
    const report = row({ id: "r1", source_type: "licensed-reporting", source_name: "Global Voices", source_domain: "globalvoices.org", title_original: "Central bank weighs new measures", source_url: "https://globalvoices.org/story", raw_metadata_json: {} });
    const overlap = buildDiscussionReportingOverlaps([q1, q1, q2, report, report], asOf)[0];
    expect(overlap.discussionItemCount).toBe(2);
    expect(overlap.discussions).toHaveLength(2);
    expect(overlap.reporting).toHaveLength(1);
    expect(overlap).not.toHaveProperty("sentiment");
    expect(overlap).not.toHaveProperty("thesis");
  });

  it("keeps regional editions visible but reports their shared publisher label once", () => {
    const question = row();
    const conversationAu = row({
      id: "r-au",
      source_type: "licensed-analysis",
      source_name: "The Conversation · Australia edition",
      source_domain: "theconversation.com",
      title_original: "Central bank outlook",
      source_url: "https://theconversation.com/au/story",
      raw_metadata_json: { publisher: "The Conversation", edition: "au" },
    });
    const conversationUs = row({
      ...conversationAu,
      id: "r-us",
      source_name: "The Conversation · U.S. edition",
      source_url: "https://theconversation.com/us/story",
      raw_metadata_json: { publisher: "The Conversation", edition: "us" },
    });
    const overlap = buildDiscussionReportingOverlaps([question, conversationAu, conversationUs], asOf)
      .find(({ matchBasis }) => matchBasis === "scheduled search phrase");
    expect(overlap?.reportingSources).toEqual([
      "The Conversation · Australia edition",
      "The Conversation · U.S. edition",
    ]);
    expect(overlap?.reportingPublishers).toEqual(["The Conversation"]);
  });
});
