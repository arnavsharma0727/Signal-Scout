import { afterEach, describe, expect, it, vi } from "vitest";
import { StackExchangeConnector } from "./stackexchange";

afterEach(() => vi.unstubAllGlobals());

describe("StackExchangeConnector", () => {
  it("collects a broad recent licensed sample across reviewed communities", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const params = new URL(String(input)).searchParams;
      const site = params.get("site");
      const items = site === "economics" ? [
        {
          title: "How do tariff changes affect consumer prices?",
          link: "https://economics.stackexchange.com/questions/123/tariff-prices",
          creation_date: Math.floor(Date.parse("2026-09-30T10:00:00Z") / 1000),
          content_license: "CC BY-SA 4.0",
          tags: ["international-trade", "prices"],
          owner: {
            display_name: "Researcher",
            link: "https://economics.stackexchange.com/users/1/researcher",
          },
        },
        {
          title: "Unlicensed response",
          link: "https://economics.stackexchange.com/questions/124/unlicensed",
          creation_date: Math.floor(Date.parse("2026-09-30T10:00:00Z") / 1000),
          content_license: "CC BY-SA 3.0",
          owner: { display_name: "Unknown", link: "https://economics.stackexchange.com/users/2/unknown" },
        },
        {
          title: "Wrong site host",
          link: "https://evil.example/questions/125/wrong-host",
          creation_date: Math.floor(Date.parse("2026-09-30T10:00:00Z") / 1000),
          content_license: "CC BY-SA 4.0",
          owner: { display_name: "Unknown", link: "https://economics.stackexchange.com/users/2/unknown" },
        },
      ] : site === "quant" ? [{
        title: "How should volatility be compared across markets?",
        link: "https://quant.stackexchange.com/questions/200/volatility",
        creation_date: Math.floor(Date.parse("2026-09-29T10:00:00Z") / 1000),
        content_license: "CC BY-SA 4.0",
        owner: { display_name: "Analyst", link: "https://quant.stackexchange.com/users/2/analyst" },
      }] : [];
      return new Response(JSON.stringify({ items }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new StackExchangeConnector().fetchDocuments({
      query: "ignored",
      start: new Date("2026-09-27T00:00:00Z"),
      end: new Date("2026-10-01T00:00:00Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(result.requestsUsed).toBe(12);
    expect(result.metadata).toMatchObject({
      lookbackDays: 30,
      collectionMethod: "recent-licensed-question-feed",
      pageSizePerCommunity: 100,
      rejectedUnlicensed: 1,
      rejectedInvalid: 1,
    });
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "stack-exchange",
      sourceName: "Economics Stack Exchange",
      titleOriginal: "How do tariff changes affect consumer prices?",
      rawMetadata: {
        attributionName: "Researcher",
        attributionUrl: "https://economics.stackexchange.com/users/1/researcher",
        contentLicense: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        site: "economics",
        collectionMethod: "recent-licensed-question-feed",
        questionBodyRetained: false,
        answerBodyRetained: false,
      },
    });
    expect(result.documents[1].sourceName).toBe("Quantitative Finance Stack Exchange");
    for (const [input] of fetchMock.mock.calls) {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/2.3/questions");
      expect(url.searchParams.get("pagesize")).toBe("100");
      expect(url.searchParams.has("title")).toBe(false);
      expect(url.searchParams.has("intitle")).toBe(false);
      expect(url.searchParams.has("fromdate")).toBe(true);
    }
    const searchedSites = new Set(fetchMock.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get("site"),
    ));
    expect(searchedSites).toEqual(new Set([
      "economics", "quant", "money", "politics", "law", "ai", "datascience", "security",
      "es.stackoverflow", "pt.stackoverflow", "ja.stackoverflow", "ru.stackoverflow",
    ]));
  });

  it("preserves language metadata for public licensed questions", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const site = new URL(String(input)).searchParams.get("site");
      const items = site === "es.stackoverflow" ? [{
        title: "¿Cómo afecta la inteligencia artificial al empleo?",
        link: "https://es.stackoverflow.com/questions/123/empleo",
        creation_date: Math.floor(Date.parse("2026-09-30T10:00:00Z") / 1000),
        content_license: "CC BY-SA 4.0",
        owner: { display_name: "Colaborador", link: "https://es.stackoverflow.com/users/1/colaborador" },
      }] : [];
      return new Response(JSON.stringify({ items }), { status: 200 });
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
      new Response(JSON.stringify({ items: [], backoff: 30 }), { status: 200 }),
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
