const DISPLAY_LANGUAGE_TAGS: Record<string, string> = {
  arabic: "ar",
  catalan: "ca",
  chinese: "zh",
  dutch: "nl",
  english: "en",
  french: "fr",
  german: "de",
  greek: "el",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko",
  portuguese: "pt",
  russian: "ru",
  spanish: "es",
  ukrainian: "uk",
  yoruba: "yo",
};

/** Convert provider language codes or display names into a valid HTML lang value. */
export function languageTag(language: string | undefined): string | undefined {
  const value = language?.trim();
  if (!value || value.toLocaleLowerCase() === "not provided") return undefined;
  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)) return value;
  return DISPLAY_LANGUAGE_TAGS[value.toLocaleLowerCase()];
}
