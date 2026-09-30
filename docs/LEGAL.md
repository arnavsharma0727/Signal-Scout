# Launch and counsel review checklist

This document records product questions that need a qualified reviewer. It is not legal advice, a legal opinion, or a statement that any source has granted Signal Scout a license.

## Current product facts

- Signal Scout is a public, non-authenticated research prototype. It stores source titles, excerpts/comment text, URLs, timestamps, domains, market/language labels, and some API-returned public metadata in Supabase.
- There is no automated retention/deletion schedule today. Public-source records remain until an operator deletes them. This is disclosed on `/privacy` and is not a launch-ready retention policy.
- Google News redirect items are excluded from public pages; no direct Korean publisher or Korean community source is configured.
- Hacker News Search is enabled as a narrow U.S.-leaning discovery sample. The official HN API exposes public data, but the current YC Terms of Use restrict commercial use and separately restrict copying/distribution/derivative use of site content absent authorization. Counsel should determine whether the API use and public display of short excerpts/links in this non-commercial app are authorized. Do not market HN coverage as representative or use it commercially without explicit clearance.
- Kakao/Daum Cafe Search is disabled. Its free request quota does not override the Kakao Developer Terms/Operating Policy prior-approval restriction on publishing, translating, or otherwise providing service data.
- Reddit is disabled pending explicit API access approval and implementation of OAuth, data refresh/removal, and deletion obligations.

## Counsel questions before broader sharing or monetization

1. For each source, may Signal Scout query, store, normalize, display short text excerpts, create aggregate counts, and expose source links to unauthenticated visitors? Which activities require written permission or attribution wording?
2. Do YC/Hacker News terms authorize this product's API-derived public excerpts and aggregate analysis, particularly if the project later becomes commercial? What content, if any, should be removed pending review?
3. What source-specific maximum retention periods and deletion/synchronization obligations apply? Should the system store only IDs, URLs, and counts rather than post text or usernames?
4. What privacy obligations apply when source results contain handles or other personal data, including requests by a source author to remove an item from Signal Scout?
5. What Korean privacy, copyright, database-right, cross-border transfer, and platform terms apply to collection, storage, processing, and display of Korean-language forum/news content in a U.S.-hosted service?
6. Does any planned scoring, alerts, or product description create investment-adviser, broker, financial-promotion, or other regulated-activity concerns? Keep the product descriptive and non-personalized unless reviewed.
7. Which user-facing terms, privacy notices, retention disclosures, takedown process, and operator contact process are required before sharing beyond a small private test?

## Operational release gates

- No Kakao, Reddit, Naver, Toss, DC Inside, or publisher RSS connector may be enabled until source-specific access, reuse, attribution, rate, retention, and deletion terms are recorded in [`SOURCES.md`](SOURCES.md).
- No paid tier, billing wallet, card, or paid overage may be enabled without separate explicit approval. Free quota is not equivalent to a reuse license.
- Before a public launch, implement and test source-specific retention plus a takedown/deletion workflow. The current indefinite-until-operator-deletes behavior is a known launch blocker.
- Keep the privacy and methodology pages aligned with actual collection, source coverage, translation, inference, and retention behavior.

## Primary source references

- [Y Combinator Legal / Terms of Use](https://www.ycombinator.com/legal/)
- [Official Hacker News API](https://github.com/HackerNews/API)
- [Kakao Developer Terms](https://developers.kakao.com/terms/en/site-terms-20250304) and [Operating Policy](https://developers.kakao.com/terms/en/site-policies-20250304)
- [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms?hslang=en) and [API access requirements](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data)
