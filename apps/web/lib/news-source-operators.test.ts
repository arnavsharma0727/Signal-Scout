import { describe, expect, it } from "vitest";
import { reviewedNewsOperatorForUrl } from "./news-source-operators";

describe("reviewed GDELT publisher identity", () => {
  it.each([
    ["https://apnews.com/article/story", "associated-press"],
    ["https://www.theguardian.com/business/story", "guardian-news-media"],
    ["https://www.reuters.com/world/story", "reuters"],
    ["https://graphics.reuters.com/story", "reuters"],
  ])("recognizes reviewed original publisher URL %s", (url, key) => {
    expect(reviewedNewsOperatorForUrl(url)?.key).toBe(key);
  });

  it.each([
    "https://apnews.com.attacker.example/story",
    "https://attacker.example/apnews.com/story",
    "http://apnews.com/story",
    "https://user:password@apnews.com/story",
    "not a URL",
  ])("does not assign publisher identity to unreviewed or deceptive URL %s", (url) => {
    expect(reviewedNewsOperatorForUrl(url)).toBeNull();
  });
});
