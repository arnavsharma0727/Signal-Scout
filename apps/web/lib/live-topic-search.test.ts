import { describe, expect, it, vi } from "vitest";
import { searchLiveDiscussion } from "./live-topic-search";

describe("searchLiveDiscussion", () => {
  it("queries one selected community and returns only attributed CC BY-SA 4.0 items", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [
        {
          question_id: 12,
          title: "How does inflation affect &#39;real&#39; rates?",
          link: "https://economics.stackexchange.com/questions/12/example",
          creation_date: 1790734268,
          content_license: "CC BY-SA 4.0",
          tags: ["inflation", "interest-rates"],
          owner: { display_name: "Researcher", link: "https://economics.stackexchange.com/users/1/researcher" },
        },
        {
          question_id: 13,
          title: "Unlicensed item",
          link: "https://economics.stackexchange.com/questions/13/example",
          creation_date: 1790734268,
          content_license: "CC BY-SA 2.5",
          owner: { display_name: "Contributor", link: "https://economics.stackexchange.com/users/2" },
        },
      ],
    }), { status: 200 }));

    const result = await searchLiveDiscussion("  inflation  ", "economics", fetchMock, Date.parse("2026-10-01T00:00:00Z"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("site")).toBe("economics");
    expect(requestUrl.searchParams.get("intitle")).toBe("inflation");
    expect(requestUrl.searchParams.get("origin")).toBe("*");
    expect(requestUrl.searchParams.get("pagesize")).toBe("25");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "How does inflation affect 'real' rates?",
      author: "Researcher",
      community: "Economics Stack Exchange",
      language: "English",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    });
  });

  it("rejects invalid queries and unlisted communities before making a request", async () => {
    const fetchMock = vi.fn();
    await expect(searchLiveDiscussion("ab", "economics", fetchMock)).rejects.toThrow("3–80 characters");
    await expect(searchLiveDiscussion("valid topic", "unknown", fetchMock)).rejects.toThrow("listed community");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a clear message when the source rate-limits requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    await expect(searchLiveDiscussion("inflation", "economics", fetchMock)).rejects.toThrow("rate-limiting");
  });
});
