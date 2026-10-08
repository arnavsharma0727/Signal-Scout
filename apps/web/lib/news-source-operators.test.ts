import { describe, expect, it } from "vitest";
import { reviewedCompanyOperatorForUrl, reviewedLinkSourceForUrl, reviewedNewsOperatorForUrl, reviewedSurveyOperatorForUrl } from "./news-source-operators";

describe("reviewed GDELT publisher identity", () => {
  it.each([
    ["https://apnews.com/article/story", "associated-press"],
    ["https://www.theguardian.com/business/story", "guardian-news-media"],
    ["https://www.reuters.com/world/story", "reuters"],
    ["https://graphics.reuters.com/story", "reuters"],
    ["https://www.abc.net.au/news/2026-10-08/story/107241548", "abc-news-australia"],
    ["https://www.smartcompany.com.au/business/story/", "smartcompany"],
  ])("recognizes reviewed original publisher URL %s", (url, key) => {
    expect(reviewedNewsOperatorForUrl(url)?.key).toBe(key);
  });

  it.each([
    "https://apnews.com.attacker.example/story",
    "https://attacker.example/apnews.com/story",
    "http://apnews.com/story",
    "https://user:password@apnews.com/story",
    "https://abc.net.au.attacker.example/news/story",
    "not a URL",
  ])("does not assign publisher identity to unreviewed or deceptive URL %s", (url) => {
    expect(reviewedNewsOperatorForUrl(url)).toBeNull();
  });
});

it("keeps issuer disclosures distinct from reporting operators", () => {
  expect(reviewedCompanyOperatorForUrl("https://firmus.co/newsroom/announcement")).toMatchObject({
    key: "firmus", label: "Firmus",
  });
  expect(reviewedLinkSourceForUrl("https://abc.net.au/news/2026-10-08/story/1")).toMatchObject({
    provider: "newslink", key: "abc-news-australia",
  });
  expect(reviewedLinkSourceForUrl("https://firmus.co/newsroom/announcement")).toMatchObject({
    provider: "companylink", key: "firmus",
  });
  expect(reviewedSurveyOperatorForUrl("https://data.verasight.io/ai/data-centers-and-household-benefits/")).toMatchObject({
    key: "verasight", label: "Verasight",
  });
  expect(reviewedLinkSourceForUrl("https://data.verasight.io/ai/data-centers-and-household-benefits/")).toMatchObject({
    provider: "surveylink", key: "verasight",
  });
  expect(reviewedLinkSourceForUrl("https://unknown.example/story")).toBeNull();
});
