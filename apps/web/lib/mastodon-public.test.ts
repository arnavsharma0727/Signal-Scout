import { describe, expect, it, vi } from "vitest";
import { searchPublicHashtag } from "./mastodon-public";

const post = {
  id: "123",
  url: "https://other.instance/@person/123",
  created_at: "2026-09-30T21:00:00.000Z",
  visibility: "public",
  content: "<p>Public discussion text</p>",
  spoiler_text: "",
  language: "en",
  account: {
    display_name: "Researcher",
    acct: "person@other.instance",
    url: "https://other.instance/@person",
    bot: false,
  },
};

describe("searchPublicHashtag", () => {
  it("queries one encoded hashtag and keeps only public, non-boost posts with provenance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      post,
      { ...post, id: "private", visibility: "unlisted" },
      { ...post, id: "boost", reblog: post },
      { ...post, id: "unsafe", url: "javascript:alert(1)" },
    ]), { status: 200 }));

    const results = await searchPublicHashtag("#public-conversation", fetchMock, Date.parse("2026-10-01T00:00:00Z"), "mstdn.jp");
    const url = new URL(fetchMock.mock.calls[0][0]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(url.hostname).toBe("mstdn.jp");
    expect(url.pathname).toBe("/api/v1/timelines/tag/public-conversation");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      url: post.url,
      authorName: "Researcher",
      authorHandle: "person@other.instance",
      authorUrl: post.account.url,
      originServer: "other.instance",
      language: "en",
      contentHtml: post.content,
      accountMarkedAutomated: false,
    });
  });

  it("rejects invalid hashtags without making a request", async () => {
    const fetchMock = vi.fn();
    await expect(searchPublicHashtag("bad/tag", fetchMock)).rejects.toThrow("1–50 letters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects arbitrary server names before making a request", async () => {
    const fetchMock = vi.fn();
    await expect(searchPublicHashtag("economics", fetchMock, Date.now(), "attacker.example" as never))
      .rejects.toThrow("Choose a supported public Mastodon server");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not try to authenticate when public access is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    await expect(searchPublicHashtag("economics", fetchMock)).rejects.toThrow("No login or workaround");
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("headers.Authorization");
  });
});
