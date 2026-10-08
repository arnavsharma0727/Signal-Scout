import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { serverSupabase } from "../../../../lib/server-supabase";
import { POST } from "./route";

vi.mock("../../../../lib/server-supabase", () => ({ serverSupabase: vi.fn() }));
vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(serverSupabase).mockReset();
});

describe("POST /api/research/gdelt", () => {
  it("returns a filtered, no-store search sample without retaining the request", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-secret");
    vi.mocked(serverSupabase).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as never);
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
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
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

  it("returns 429 and does not contact GDELT when the shared limit is exceeded", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-secret");
    vi.mocked(serverSupabase).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost/api/research/gdelt", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ query: "semiconductor exports", outletCountry: "", outletLanguage: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed if shared rate-limit storage is unavailable", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-secret");
    vi.mocked(serverSupabase).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("database unavailable") }),
    } as never);
    const request = new NextRequest("http://localhost/api/research/gdelt", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ query: "semiconductor exports", outletCountry: "", outletLanguage: "" }),
    });
    expect((await POST(request)).status).toBe(503);
  });
});
