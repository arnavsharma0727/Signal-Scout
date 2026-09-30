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

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(result.requestsUsed).toBe(6);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].marketCode).toBe("INTL");
    expect(result.documents[0].titleOriginal).toBe("Is inflation 'transitory'?");
    expect(result.documents[0].sourceName).toBe("Stack Exchange · economics");
    expect(result.documents[0].rawMetadata).toMatchObject({
      attributionName: "Researcher",
      contentLicense: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    });
  });
});
