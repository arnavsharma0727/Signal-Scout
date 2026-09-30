import { afterEach, describe, expect, it, vi } from "vitest";
import { GDELTConnector } from "./gdelt";

afterEach(() => vi.unstubAllGlobals());

describe("GDELT connector", () => {
  it("records global results as international news and includes project attribution", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          articles: [
            {
              title: "Global inflation report",
              url: "https://publisher.example/story",
              seendate: "20260930120000",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GDELTConnector().fetchDocuments({
      query: "inflation OR tariffs",
      start: new Date("2026-09-29T00:00:00Z"),
      end: new Date("2026-09-30T00:00:00Z"),
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "gdelt",
      rawMetadata: {
        gdeltCitation: "GDELT Project",
        gdeltCitationUrl: "https://www.gdeltproject.org/",
      },
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.searchParams.get("maxrecords")).toBe("50");
    expect(requestUrl.searchParams.get("query")).toBe("inflation OR tariffs");
  });
});
