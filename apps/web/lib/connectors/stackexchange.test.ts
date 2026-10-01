import { afterEach, describe, expect, it, vi } from "vitest";
import { StackExchangeConnector } from "./stackexchange";

afterEach(() => vi.unstubAllGlobals());

describe("StackExchangeConnector", () => {
  it("keeps only explicitly licensed items and records attribution", async () => {
    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(
      () => new Response(
        JSON.stringify({
          items: ++calls === 1 ? [
            {
              title: "Is inflation &#39;transitory&#39;?",
              link: "https://economics.stackexchange.com/questions/123/example",
              creation_date: 1790734268,
              content_license: "CC BY-SA 4.0",
              tags: ["inflation", "economics"],
              owner: {
                display_name: "Researcher",
                link: "https://economics.stackexchange.com/users/1/researcher",
              },
            },
            {
              title: "Unlicensed response",
              link: "https://economics.stackexchange.com/questions/124/example",
              content_license: null,
              owner: { display_name: "Unknown" },
            },
            {
              title: "Unrelated but licensed question",
              link: "https://economics.stackexchange.com/questions/125/example",
              creation_date: 1790734268,
              content_license: "CC BY-SA 4.0",
              tags: ["economics"],
              owner: { display_name: "Researcher" },
            },
          ] : [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new StackExchangeConnector().fetchDocuments({
      query: "ignored",
      start: new Date("2026-09-27T00:00:00Z"),
      end: new Date("2026-10-01T00:00:00Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(33);
    expect(result.requestsUsed).toBe(33);
    expect(result.metadata).toMatchObject({ lookbackDays: 30 });
    expect(result.metadata.rejectedTitleMismatch).toBe(1);
    for (const [url] of fetchMock.mock.calls) {
      const params = new URL(String(url)).searchParams;
      expect(params.get("title")).toBeTruthy();
      expect(params.has("intitle")).toBe(false);
      expect(params.get("fromdate")).toBe(String(Math.floor(Date.parse("2026-09-01T00:00:00Z") / 1000)));
      expect(params.get("pagesize")).toBe("100");
    }
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].marketCode).toBe("INTL");
    expect(result.documents[0].titleOriginal).toBe("Is inflation 'transitory'?");
    expect(result.documents[0].sourceName).toBe("Economics Stack Exchange");
    expect(result.documents[0].rawMetadata).toMatchObject({
      attributionName: "Researcher",
      contentLicense: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      tags: ["inflation", "economics"],
      site: "economics",
    });
    const searchedSites = new Set(
      fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("site")),
    );
    expect(searchedSites).toEqual(
      new Set([
        "economics", "money", "ai", "datascience", "security",
        "es.stackoverflow", "pt.stackoverflow", "ja.stackoverflow", "ru.stackoverflow",
        "politics", "law",
      ]),
    );
  });

  it("preserves the language and site for licensed localized questions", async () => {
    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      calls++;
      const items = calls === 16 ? [{
        title: "¿Cómo implementar inteligencia artificial?",
        link: "https://es.stackoverflow.com/questions/123/example",
        creation_date: 1790734268,
        content_license: "CC BY-SA 4.0",
        owner: { display_name: "Contributor", link: "https://es.stackoverflow.com/users/1" },
      }] : [];
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new StackExchangeConnector().fetchDocuments({
      query: "ignored",
      start: new Date("2026-09-27T00:00:00Z"),
      end: new Date("2026-10-01T00:00:00Z"),
    });

    expect(result.documents[0]).toMatchObject({
      sourceName: "Stack Overflow en español",
      languageCode: "es",
      marketCode: "INTL",
    });
  });

  it("stops before another API request when the requested backoff is long", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], backoff: 30 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new StackExchangeConnector().fetchDocuments({
      query: "ignored",
      start: new Date("2026-09-27T00:00:00Z"),
      end: new Date("2026-10-01T00:00:00Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.metadata.stoppedForBackoff).toBe(true);
  });
});
