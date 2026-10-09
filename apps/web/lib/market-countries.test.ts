import { describe, expect, it } from "vitest";
import { MARKET_COUNTRIES, marketCountry } from "./market-countries";

describe("market country search lenses", () => {
  it("offers eight language lenses supported by the live search workflow", () => {
    expect(MARKET_COUNTRIES).toHaveLength(8);
    expect(MARKET_COUNTRIES.map(({ code }) => code)).toEqual(["US", "KR", "JP", "DE", "FR", "BR", "IN", "ES"]);
  });

  it("maps localized markets only to configured and supported public instances", () => {
    expect(marketCountry("JP")).toMatchObject({ language: "ja", lemmyInstances: ["lemmy.world"], mastodonInstances: ["mstdn.jp"] });
    expect(marketCountry("DE").lemmyInstances).toEqual(["discuss.tchncs.de", "feddit.org"]);
    expect(marketCountry("FR").lemmyInstances).toEqual(["jlai.lu"]);
    expect(() => marketCountry("XX")).toThrow("supported country");
  });
});
