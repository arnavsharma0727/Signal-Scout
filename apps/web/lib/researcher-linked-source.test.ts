import { describe, expect, it } from "vitest";
import { isPublishableResearcherLinkedCitation, prepareResearcherLinkedSource } from "./researcher-linked-source";

const now = Date.parse("2026-10-06T12:00:00Z");
const id = "44444444-4444-4444-8444-444444444444";
const valid = {
  id: "bluesky:at://did:plc:author/app.bsky.feed.post/abc123",
  title: "Public post by @researcher.example",
  url: "https://bsky.app/profile/researcher.example/post/abc123",
  timeValue: "2026-10-06T10:00:00.000Z",
  language: "en",
  attribution: "Author: @researcher.example",
  assessment: "supports" as const,
  sourceObservation: "The original public post describes a specific concern about the new policy.",
  researcherVerifiedOriginal: true as const,
};

describe("researcher-linked social citation gate", () => {
  it("stores a recent supported Bluesky citation as link-only metadata", () => {
    const row = prepareResearcherLinkedSource(valid, id, now);
    expect(row).toMatchObject({
      id,
      source_type: "researcher-linked-source",
      source_name: "Bluesky public post",
      source_domain: "bsky.app",
      source_url: valid.url,
      raw_metadata_json: {
        citationProvider: "bluesky",
        attribution: valid.attribution,
        researcherLinkedOnly: true,
        postBodyDiscarded: true,
        transientPreviewDiscarded: true,
      },
    });
    expect(row).not.toHaveProperty("excerpt_original");
    expect(prepareResearcherLinkedSource({ ...valid, title: "Client-supplied copy of a post" }, id, now)?.title_original)
      .toBe("Public post by @researcher.example");
  });

  it("accepts only configured Mastodon and Lemmy canonical post hosts", () => {
    expect(prepareResearcherLinkedSource({
      ...valid,
      id: "mastodon:123",
      url: "https://mastodon.social/@reader/12345",
    }, id, now)?.raw_metadata_json).toMatchObject({ citationProvider: "mastodon" });
    expect(prepareResearcherLinkedSource({
      ...valid,
      id: "lemmy:https://lemmy.world/post/123",
      url: "https://lemmy.world/post/123",
      title: "A community discussion",
      attribution: "Lemmy author: reader",
    }, id, now)).toMatchObject({
      raw_metadata_json: { citationProvider: "lemmy" },
      title_original: "Public Lemmy post by reader",
    });
    expect(prepareResearcherLinkedSource({
      ...valid,
      id: "mastodon:123",
      url: "https://unknown.example/@reader/12345",
    }, id, now)).toBeNull();
    const timeValue = new Date(Date.now() - 60 * 60_000).toISOString();
    expect(isPublishableResearcherLinkedCitation({ id: "mastodon:123", url: "https://mastodon.social/@reader/12345", timeValue })).toBe(true);
    expect(isPublishableResearcherLinkedCitation({ id: "mastodon:123", url: "https://other.social/@reader/12345", timeValue })).toBe(false);
  });

  it("rejects noncanonical, stale, future, unreviewed, or unattributed citations", () => {
    expect(prepareResearcherLinkedSource({ ...valid, url: "http://bsky.app/profile/a/post/b" }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, url: `${valid.url}?tracking=1` }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, timeValue: "2026-09-20T12:00:00Z" }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, timeValue: "2026-10-07T12:00:00Z" }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, researcherVerifiedOriginal: false as never }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, attribution: "" }, id, now)).toBeNull();
    expect(prepareResearcherLinkedSource({ ...valid, sourceObservation: "short" }, id, now)).toBeNull();
  });
});
