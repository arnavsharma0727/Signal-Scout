import { describe, expect, it, vi } from "vitest";
import { withFetchTimeout } from "./fetch-with-timeout";

describe("withFetchTimeout", () => {
  it("aborts stalled provider requests with a readable timeout error", async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));

    await expect(withFetchTimeout(fetcher, 5)("https://example.test"))
      .rejects.toThrow("Source request timed out after 1 seconds.");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("clears the timeout after a successful response", async () => {
    vi.useFakeTimers();
    try {
      const response = new Response("ok");
      const fetcher = vi.fn(async () => response);
      await expect(withFetchTimeout(fetcher, 500)("https://example.test")).resolves.toBe(response);
      await vi.advanceTimersByTimeAsync(600);
      expect(fetcher).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
