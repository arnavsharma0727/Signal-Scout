# Korean source strategy

The MVP compares two configured information environments: Korean-language sources and an American/English source set. A source is never treated as representative of an entire market.

## Authorized sources

- Naver Search API: official `news`, `blog`, and `webkr` search endpoints. It requires an application with `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`, and results must preserve Korean title, description, link, publication time when provided, and source metadata.
- Naver DataLab Search Trend API: optional supporting context only. It measures normalized relative attention within the source and time series; it is not raw search volume, demand, sales, or a forum feed. It must never create a divergence by itself.
- Official RSS/Atom feeds: preferred no-key source for Korean company newsrooms, product blogs, and status pages when the publisher permits automated access.
- GDELT: keyless broad discovery with rate limits. It is not a substitute for a Korean forum API and is not proof of a story.
- Reddit Data API: not implemented. Reddit currently requires an access request and explicit approval before data access, plus OAuth and a descriptive User-Agent. It is not a Korean forum source. Do not access it until Signal Scout's intended use is approved and the product can honor its retention/deletion terms; commercial use has an additional contract gate.
- Kakao/Daum Cafe Search: Kakao officially exposes a Cafe post search endpoint; its published free quota is 30,000 requests/day at the time of review. The Kakao Developer Terms and Operating Policy prohibit publishing, translating, or otherwise providing data obtained through the service without prior approval. Therefore this is **not currently an authorized Signal Scout source**, even if a REST key is available and calls remain within the free quota. Obtain written permission for this product's ingestion, storage, analysis, and public display before enabling it. Never enable paid quotas or billing.

## Sources not implemented by scraping

DC Inside, Naver Cafes, Kakao communities, and other forum sites should not be scraped or bypassed. Kakao's official search endpoint does not remove the separate permission gate above. If an official authorized API or export becomes usable under explicit terms, add it as a typed connector with attribution, strict quotas, and retention rules.

## MVP interpretation

The product should show source counts, independent domains, language, source type, exact time window, and sample definition. It should describe a difference in configured source samples, not “what Koreans think” or “what Americans think.”
