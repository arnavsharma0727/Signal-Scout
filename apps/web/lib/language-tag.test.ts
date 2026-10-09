import { describe, expect, it } from "vitest";
import { languageTag } from "./language-tag";

describe("languageTag", () => {
  it("maps display names to valid language tags for assistive technologies", () => {
    expect(languageTag("Korean")).toBe("ko");
    expect(languageTag("Portuguese")).toBe("pt");
    expect(languageTag("Arabic")).toBe("ar");
  });

  it("preserves language codes and leaves unknown or missing language unspecified", () => {
    expect(languageTag("ko")).toBe("ko");
    expect(languageTag("zh-Hant")).toBe("zh-Hant");
    expect(languageTag("not provided")).toBeUndefined();
    expect(languageTag("Some unknown language")).toBeUndefined();
  });
});
