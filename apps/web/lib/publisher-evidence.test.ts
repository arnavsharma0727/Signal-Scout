import { describe, expect, it } from "vitest";
import { matchesOriginalTitlePhrase, toPublisherEvidence } from "./publisher-evidence";

const now = Date.parse("2026-10-01T12:00:00Z");
const recent = "2026-10-01T10:00:00Z";

describe("reviewed publisher evidence", () => {
  it("filters headline phrases literally across Latin, accented, and CJK text", () => {
    expect(matchesOriginalTitlePhrase("Interest rates rise", "interest rates")).toBe(true);
    expect(matchesOriginalTitlePhrase("Markets await decisions", "rate")).toBe(false);
    expect(matchesOriginalTitlePhrase("How to build an AI tool", "AI")).toBe(true);
    expect(matchesOriginalTitlePhrase("Said investors react", "AI")).toBe(false);
    expect(matchesOriginalTitlePhrase("La inflación aumenta", "inflación")).toBe(true);
    expect(matchesOriginalTitlePhrase("日本銀行の政策", "日本銀行")).toBe(true);
    expect(matchesOriginalTitlePhrase("한국은행의 결정", "한국은행")).toBe(true);
    expect(matchesOriginalTitlePhrase("Anything", "")).toBe(true);
  });

  it("accepts localized Global Voices titles with attribution and CC BY metadata only", () => {
    const result = toPublisherEvidence({
      id: "gv-1", source_type: "licensed-reporting", source_name: "Global Voices · Spanish edition",
      source_domain: "es.globalvoices.org", language_code: "es", title_original: "Titular",
      source_url: "https://es.globalvoices.org/2026/10/01/story/", published_at: recent,
      raw_metadata_json: {
        publisher: "Global Voices", author: "Reporter", editionLabel: "Spanish",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/", titleUnmodified: true,
        articleBodyDiscarded: true, mediaDiscarded: true,
      },
    }, now);
    expect(result).toMatchObject({
      title: "Titular", language: "es", evidenceClass: "news coverage",
      sourceOperatorKey: "global-voices", sourceOperatorLabel: "Global Voices",
      licenseName: "CC BY 3.0", attribution: "Reporter",
    });
    expect(result).not.toHaveProperty("excerpt");
  });

  it("requires the recorded no-derivatives rights and body-discard metadata for The Conversation", () => {
    const row = {
      id: "tc-1", source_type: "licensed-analysis", source_name: "The Conversation · AU",
      source_domain: "theconversation.com", language_code: "en", title_original: "Analysis title",
      source_url: "https://theconversation.com/example", published_at: recent,
      raw_metadata_json: {
        publisher: "The Conversation", edition: "au", authors: ["Author"],
        rightsStatement: "Creative Commons Attribution-No Derivatives", attributionRequired: true,
        derivativesAllowed: false, contentPolicy: "unmodified-title-author-link-date-only",
        summaryDiscarded: true, articleBodyDiscarded: true,
      },
    };
    expect(toPublisherEvidence(row, now)?.sourceOperatorKey).toBe("the-conversation");
    expect(toPublisherEvidence({ ...row, raw_metadata_json: { ...row.raw_metadata_json, derivativesAllowed: true } }, now)).toBeNull();
  });

  it("requires an allowed URL, intact Typst CC BY fields, and a fresh publication date", () => {
    const row = {
      id: "typst-1", source_type: "licensed-forum", source_name: "Typst Forum",
      source_domain: "forum.typst.app", language_code: null, title_original: "Topic",
      source_url: "https://forum.typst.app/t/topic/123", published_at: recent,
      raw_metadata_json: {
        publisher: "Typst Forum", author: "Member", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        titleUnmodified: true, postBodyAndSummaryDiscarded: true,
      },
    };
    expect(toPublisherEvidence(row, now)?.evidenceClass).toBe("community forum");
    expect(toPublisherEvidence({ ...row, source_url: "https://forum.typst.app.evil.example/t/topic/123" }, now)).toBeNull();
    expect(toPublisherEvidence({ ...row, published_at: "2026-09-20T00:00:00Z" }, now)).toBeNull();
    expect(toPublisherEvidence({ ...row, published_at: "2026-10-02T00:00:00Z" }, now)).toBeNull();
    expect(toPublisherEvidence({ ...row, raw_metadata_json: { ...row.raw_metadata_json, licenseUrl: "https://example.org/" } }, now)).toBeNull();
  });
});
