import { describe, expect, it } from "vitest";
import { preparePublicLeadSubmission, type LeadSourceDocument, type ReviewedLeadCitation } from "./research-lead-submission";

const asOf = Date.parse("2026-10-06T12:00:00Z");
const documents: LeadSourceDocument[] = [
  {
    id: "11111111-1111-4111-8111-111111111111", source_type: "licensed-forum",
    source_name: "Fedora Discussion", source_domain: "discussion.fedoraproject.org",
    language_code: "en", title_original: "Local energy cost concerns", source_url: "https://discussion.fedoraproject.org/t/energy-costs/123",
    published_at: "2026-10-06T10:00:00Z",
    raw_metadata_json: { publisher: "Fedora Discussion", author: "reader-one", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", titleUnmodified: true, topicBodyAndRepliesDiscarded: true, profileDetailsDiscarded: true },
  },
  {
    id: "22222222-2222-4222-8222-222222222222", source_type: "licensed-forum",
    source_name: "Typst Forum", source_domain: "forum.typst.app", language_code: "en",
    title_original: "A separate power-price discussion", source_url: "https://forum.typst.app/t/power-prices/456",
    published_at: "2026-10-06T09:00:00Z",
    raw_metadata_json: { publisher: "Typst Forum", author: "reader-two", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", titleUnmodified: true, postBodyAndSummaryDiscarded: true },
  },
  {
    id: "33333333-3333-4333-8333-333333333333", source_type: "licensed-reporting",
    source_name: "Global Voices · Spanish edition", source_domain: "es.globalvoices.org", language_code: "es",
    title_original: "A report on household power prices", source_url: "https://es.globalvoices.org/2026/10/06/power-prices/",
    published_at: "2026-10-06T08:00:00Z",
    raw_metadata_json: { publisher: "Global Voices", author: "Reporter", editionLabel: "Spanish", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", titleUnmodified: true, articleBodyDiscarded: true, mediaDiscarded: true },
  },
];
const citations: ReviewedLeadCitation[] = [
  { documentId: documents[0].id, assessment: "supports", sourceObservation: "The forum topic explicitly describes a new household electricity-cost concern.", researcherVerifiedOriginal: true },
  { documentId: documents[1].id, assessment: "contradicts", sourceObservation: "This separate community discussion describes a stable local electricity bill instead.", researcherVerifiedOriginal: true },
  { documentId: documents[2].id, assessment: "context", sourceObservation: "The independent reporting explains a recent tariff change in the region.", researcherVerifiedOriginal: true },
];

describe("public research lead submission gate", () => {
  const input = {
    topic: "Household electricity costs",
    workingThesis: "Discussion may reflect a growing concern about near-term electricity bills.",
    alternatives: "The selected posts may concern scheduled seasonal tariff notices rather than a new cost shock.",
    disconfirmingEvidence: "A broader sample with stable bills and no tariff changes would weaken the working thesis.",
    citations,
    documents,
    asOf,
  };

  it("prepares a draft only from recent, rights-checked, two-sided, multi-operator evidence", () => {
    const result = preparePublicLeadSubmission(input);
    expect(result?.lead).toMatchObject({
      market_code: "INTL", status: "draft", independent_source_count: 3,
      methodology_version: "human-reviewed-v1", research_priority_score: null,
    });
    expect(result?.evidence.map(({ relationshipType }) => relationshipType)).toEqual([
      "supporting", "counter-evidence", "context",
    ]);
  });

  it("accepts researcher-reviewed social permalinks as link-only conversation evidence", () => {
    const socialDocuments = documents.map((document, index) => index === 2 ? document : {
      ...document,
      source_type: "researcher-linked-source",
      source_name: index === 0 ? "Bluesky public post" : "Mastodon · mastodon.social",
      source_domain: index === 0 ? "bsky.app" : "mastodon.social",
      source_url: index === 0
        ? "https://bsky.app/profile/reader.example/post/first"
        : "https://mastodon.social/@reader-two/12345",
      title_original: index === 0 ? "Public post by @reader-one" : "Public post by @reader-two",
      raw_metadata_json: {
        citationProvider: index === 0 ? "bluesky" : "mastodon",
        attribution: index === 0 ? "Author: @reader-one" : "Author: @reader-two",
        researcherLinkedOnly: true, postBodyDiscarded: true, transientPreviewDiscarded: true,
      },
    });
    const result = preparePublicLeadSubmission({ ...input, documents: socialDocuments });
    expect(result?.lead).toMatchObject({
      status: "draft", independent_source_count: 3,
      evidence_level: "researcher-reviewed-citations",
    });
  });

  it("accepts two source-checked social links plus a reviewed report and separately labeled issuer context", () => {
    const mixed: LeadSourceDocument[] = [
      ...documents.slice(0, 2).map((document, index) => ({
        ...document,
        source_type: "researcher-linked-source",
        source_name: "Bluesky public post",
        source_domain: "bsky.app",
        source_url: `https://bsky.app/profile/reader-${index + 1}.example/post/${index + 1}`,
        title_original: `Public post by @reader-${index + 1}.example`,
        raw_metadata_json: {
          citationProvider: "bluesky", attribution: `Author: @reader-${index + 1}.example`,
          researcherLinkedOnly: true, postBodyDiscarded: true, transientPreviewDiscarded: true,
        },
      })),
      {
        ...documents[2],
        id: "44444444-4444-4444-8444-444444444444",
        source_type: "researcher-linked-source", source_name: "ABC News Australia",
        source_domain: "www.abc.net.au", source_url: "https://www.abc.net.au/news/2026-10-06/business/123456",
        title_original: "Link-only report from ABC News Australia",
        raw_metadata_json: {
          citationProvider: "newslink", reviewedPublisherKey: "abc-news-australia",
          reviewedPublisherLabel: "ABC News Australia", attribution: "Source: ABC News Australia",
          researcherLinkedOnly: true, postBodyDiscarded: true, transientPreviewDiscarded: true,
        },
      },
      {
        ...documents[2],
        id: "55555555-5555-4555-8555-555555555555",
        source_type: "researcher-linked-source", source_name: "Firmus", source_domain: "firmus.co",
        source_url: "https://firmus.co/newsroom/announcement",
        title_original: "Link-only company disclosure from Firmus",
        raw_metadata_json: {
          citationProvider: "companylink", reviewedPublisherKey: "firmus", reviewedPublisherLabel: "Firmus",
          attribution: "Source: Firmus", researcherLinkedOnly: true,
          postBodyDiscarded: true, transientPreviewDiscarded: true,
        },
      },
      {
        ...documents[2],
        id: "66666666-6666-4666-8666-666666666666",
        source_type: "researcher-linked-source", source_name: "Verasight", source_domain: "data.verasight.io",
        source_url: "https://data.verasight.io/ai/data-centers-and-household-benefits/",
        title_original: "Link-only survey report from Verasight",
        raw_metadata_json: {
          citationProvider: "surveylink", reviewedPublisherKey: "verasight", reviewedPublisherLabel: "Verasight",
          attribution: "Source: Verasight", researcherLinkedOnly: true,
          postBodyDiscarded: true, transientPreviewDiscarded: true,
        },
      },
    ];
    const reviewed: ReviewedLeadCitation[] = [
      { documentId: mixed[0].id, assessment: "supports", sourceObservation: "This public author frames the reported offer change as a warning about investor demand.", researcherVerifiedOriginal: true },
      { documentId: mixed[1].id, assessment: "contradicts", sourceObservation: "A second public author disputes the credibility of the reported valuation and planned float.", researcherVerifiedOriginal: true },
      { documentId: mixed[2].id, assessment: "context", sourceObservation: "The independent report documents that book closure and repricing were still being assessed.", researcherVerifiedOriginal: true },
      { documentId: mixed[3].id, assessment: "context", sourceObservation: "The issuer announcement describes customer commitments but does not establish that planned sites are operating.", researcherVerifiedOriginal: true },
      { documentId: mixed[4].id, assessment: "context", sourceObservation: "The survey report states its U.S. adult population, field dates, sample size, and scenario wording.", researcherVerifiedOriginal: true },
    ];
    expect(preparePublicLeadSubmission({ ...input, citations: reviewed, documents: mixed })?.lead).toMatchObject({
      status: "draft", independent_source_count: 4,
      methodology_version: "human-reviewed-v1",
    });
  });

  it("rejects duplicate source links even when they use different database IDs and bylines", () => {
    const socialDocuments = documents.map((document, index) => index === 2 ? document : {
      ...document,
      source_type: "researcher-linked-source",
      source_name: "Bluesky public post",
      source_domain: "bsky.app",
      source_url: "https://bsky.app/profile/reader-one/post/shared",
      title_original: index === 0 ? "Public post by @reader-one" : "Public post by @reader-two",
      raw_metadata_json: {
        citationProvider: "bluesky",
        attribution: index === 0 ? "Author: @reader-one" : "Author: @reader-two",
        researcherLinkedOnly: true, postBodyDiscarded: true, transientPreviewDiscarded: true,
      },
    });
    expect(preparePublicLeadSubmission({ ...input, documents: socialDocuments })).toBeNull();
  });

  it("rejects repeated byline labels even when the source records are numerous", () => {
    const sameByline = documents.map((document, index) => index < 2
      ? { ...document, raw_metadata_json: { ...document.raw_metadata_json!, author: "same-reader" } }
      : document);
    expect(preparePublicLeadSubmission({ ...input, documents: sameByline })).toBeNull();
  });

  it("rejects sources without the recorded rights, attribution, or exact stored identity", () => {
    expect(preparePublicLeadSubmission({
      ...input,
      documents: documents.map((document, index) => index === 0
        ? { ...document, raw_metadata_json: { ...document.raw_metadata_json!, licenseUrl: "https://example.org/" } }
        : document),
    })).toBeNull();
    expect(preparePublicLeadSubmission({ ...input, documents: documents.slice(1) })).toBeNull();
  });

  it("requires a source-specific observation, checked originals, support and contradiction, and real alternatives", () => {
    expect(preparePublicLeadSubmission({ ...input, citations: citations.map((item, i) => i === 0 ? { ...item, sourceObservation: "too short" } : item) })).toBeNull();
    expect(preparePublicLeadSubmission({ ...input, citations: citations.map((item, i) => i === 0 ? { ...item, researcherVerifiedOriginal: false as never } : item) })).toBeNull();
    expect(preparePublicLeadSubmission({ ...input, citations: citations.map((item) => ({ ...item, assessment: "supports" as const })) })).toBeNull();
    expect(preparePublicLeadSubmission({ ...input, alternatives: "short" })).toBeNull();
  });

  it("rejects stale, future-dated, or fabricated citation ids", () => {
    expect(preparePublicLeadSubmission({ ...input, asOf: asOf + 5 * 86400000 })).toBeNull();
    expect(preparePublicLeadSubmission({ ...input, citations: citations.map((item, index) => index === 0 ? { ...item, documentId: "99999999-9999-4999-8999-999999999999" } : item) })).toBeNull();
  });
});
