# Korean source strategy

The MVP compares two configured information environments: Korean-language sources and an American/English source set. A source is never treated as representative of an entire market.

## Authorized sources

- Naver Search API: official `news`, `blog`, and `webkr` search endpoints. It requires an application with `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`, and results must preserve Korean title, description, link, publication time when provided, and source metadata.
- Naver DataLab Search Trend API: optional supporting context only. It measures normalized relative attention within the source and time series; it is not raw search volume, demand, sales, or a forum feed. It must never create a divergence by itself.
- Official RSS/Atom feeds: preferred no-key source for Korean company newsrooms, product blogs, and status pages when the publisher permits automated access.
- GDELT: keyless broad discovery with rate limits. It is not a substitute for a Korean forum API and is not proof of a story.
- Reddit API: authorized OAuth access only for public English communities. It is not a Korean forum connector and must follow Reddit's developer terms.

## Sources not implemented by scraping

DC Inside, Naver Cafes, Kakao communities, and other forum sites should not be scraped or bypassed. If an official authorized API or export becomes available, add it as a typed connector with explicit attribution, rate limits, quotas, and retention rules.

## MVP interpretation

The product should show source counts, independent domains, language, source type, exact time window, and sample definition. It should describe a difference in configured source samples, not “what Koreans think” or “what Americans think.”
