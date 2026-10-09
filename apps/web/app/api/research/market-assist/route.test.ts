import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/research/market-assist", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

describe("free-tier market assist", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_FREE_TIER_ENABLED", "false");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    vi.unstubAllGlobals();
  });

  it("does not call an AI provider unless explicitly enabled server-side", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(makeRequest({ action: "summarize", topic: "semiconductors", country: "KR", aiConsent: true, evidence: { us: [], local: [] } }));
    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires explicit visitor consent before sending data to Groq", async () => {
    vi.stubEnv("GROQ_FREE_TIER_ENABLED", "true");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(makeRequest({ action: "prepare", topic: "semiconductors", country: "KR", aiConsent: false }));
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an AI summary from source excerpts without exposing source URLs", async () => {
    vi.stubEnv("GROQ_FREE_TIER_ENABLED", "true");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(String(_url)).toBe("https://api.groq.com/openai/v1/chat/completions");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
      const prompt = JSON.parse(String(init?.body)).messages[0].content as string;
      expect(prompt).toContain("semiconductors");
      expect(prompt).not.toContain("https://private.example");
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ usSummary: "US sample notes demand.", localSummary: "KR sample notes exports.", comparison: "Samples differ; evidence is limited.", limitations: ["Not representative"] }) } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    const response = await POST(makeRequest({
      action: "summarize", topic: "semiconductors", country: "KR", aiConsent: true,
      evidence: { us: [{ source: "Bluesky", title: "US discussion", excerpt: "Demand comments", language: "en" }], local: [{ source: "Lemmy", title: "KR discussion", excerpt: "Export comments", language: "ko" }] },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "ai", summary: { usSummary: "US sample notes demand.", localSummary: "KR sample notes exports." } });
  });
});
