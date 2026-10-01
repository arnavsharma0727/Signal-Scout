import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FEDORA_DISCUSSION_LICENSE,
  FedoraDiscussionConnector,
} from "./fedora-discussion";

afterEach(() => vi.unstubAllGlobals());

const input = {
  query: "not used by latest endpoint",
  start: new Date("2026-09-29T00:00:00Z"),
  end: new Date("2026-10-02T00:00:00Z"),
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    users: [
      { id: 12, username: "original.poster", name: "Do not retain display name" },
      { id: 13, username: "reply.author" },
    ],
    topic_list: {
      topics: [{
        id: 1234,
        slug: "a-public-topic",
        title: "A public Fedora community topic",
        created_at: "2026-09-30T09:00:00Z",
        last_posted_at: "2026-10-01T09:30:00Z",
        visible: true,
        reply_count: 4,
        posters: [{ user_id: 12 }, { user_id: 13 }],
        post_body: "Never collect reply text",
        ...overrides,
      }],
    },
  };
}

function response(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

describe("Fedora Discussion licensed public-topic connector", () => {
  it("retains only the attributed title, dates, reply-count snapshot, and source link", async () => {
    const fetcher = vi.fn(async () => response(payload()));
    vi.stubGlobal("fetch", fetcher);
    const result = await new FedoraDiscussionConnector().fetchDocuments(input);
    expect(result.requestsUsed).toBe(1);
    expect(fetcher).toHaveBeenCalledWith("https://discussion.fedoraproject.org/latest.json", expect.objectContaining({
      headers: expect.objectContaining({ accept: "application/json" }),
    }));
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "licensed-forum",
      sourceName: "Fedora Discussion · community forum",
      sourceDomain: "discussion.fedoraproject.org",
      titleOriginal: "A public Fedora community topic",
      sourceUrl: "https://discussion.fedoraproject.org/t/a-public-topic/1234",
      publishedAt: "2026-10-01T09:30:00.000Z",
      excerptOriginal: undefined,
      rawMetadata: {
        publisher: "Fedora Discussion",
        author: "original.poster",
        replyCountAtFetch: 4,
        licenseUrl: FEDORA_DISCUSSION_LICENSE,
        titleUnmodified: true,
        topicBodyAndRepliesDiscarded: true,
        profileDetailsDiscarded: true,
        geographicMarketInferred: false,
      },
    });
    expect(JSON.stringify(result.documents)).not.toContain("Never collect reply text");
    expect(JSON.stringify(result.documents)).not.toContain("Do not retain display name");
  });

  it("rejects stale, future, hidden, or unattributed topics", async () => {
    const stale = payload({ last_posted_at: "2026-09-28T23:59:59Z" }).topic_list;
    const future = payload({ last_posted_at: "2026-10-02T00:00:01Z" }).topic_list;
    const hidden = payload({ visible: false }).topic_list;
    const noAuthor = payload({ posters: [{ user_id: 999 }] }).topic_list;
    vi.stubGlobal("fetch", vi.fn(async () => response({
      users: payload().users,
      topic_list: { topics: [...stale.topics, ...future.topics, ...hidden.topics, ...noAuthor.topics] },
    })));
    const result = await new FedoraDiscussionConnector().fetchDocuments(input);
    expect(result.documents).toHaveLength(0);
    expect(result.metadata.itemsRejected).toBe(4);
  });

  it("rejects invalid identity, unsafe URLs, malformed responses, and oversized bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ users: [], topic_list: {} })));
    await expect(new FedoraDiscussionConnector().fetchDocuments(input)).rejects.toThrow("Unexpected Fedora Discussion");

    const foreign = response(payload());
    Object.defineProperty(foreign, "url", { value: "https://evil.example/latest.json" });
    vi.stubGlobal("fetch", vi.fn(async () => foreign));
    await expect(new FedoraDiscussionConnector().fetchDocuments(input)).rejects.toThrow("redirected outside the allowlist");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(1_000_001))));
    await expect(new FedoraDiscussionConnector().fetchDocuments(input)).rejects.toThrow("exceeded its size limit");
  });
});
