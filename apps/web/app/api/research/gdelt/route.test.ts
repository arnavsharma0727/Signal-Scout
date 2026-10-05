import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/research/gdelt", () => {
  it("returns a filtered, no-store search sample without retaining the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ articles: [{
      title: "Recent policy update",
      url: "https://publisher.example/story",
      seendate: "20261005120000",
      domain: "publisher.example",
      language: "English",
      sourcecountry: "United States",
    }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/research/gdelt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "semiconductor exports", outletCountry: "", outletLanguage: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ articles: [{ title: "Recent policy update", domain: "publisher.example" }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid topic and filter values before contacting GDELT", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/research/gdelt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "x", outletCountry: "all", outletLanguage: "" }),
    });
    expect((await POST(request)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
