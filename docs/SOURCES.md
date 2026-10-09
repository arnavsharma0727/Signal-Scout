# Atlas source register

This register describes the product that is currently shipped. `/sources` is the live operational register, and [`data-sources.md`](data-sources.md) documents the visitor-triggered search behavior. Old design notes that describe removed screens are not current product documentation.

## Search used by the shipped workflow

| Source | Product role | Scope and limitation |
| --- | --- | --- |
| Hacker News (Algolia public search) | Default English-language public comments | Technology-oriented community; 30-day window and 20-result cap. Not a general market or U.S. sample. |
| Global Voices localized editions | Default international reporting headlines | Twelve language editions, headline metadata only, 30-day window, capped per edition. Editions share one publisher and do not identify contributor or audience location. A first-party request is rate-limited; partial and unavailable states are surfaced. |
| Stack Exchange | Selected specialist Q&A communities | Default English communities; optional non-English communities. Title-only, 30-day window, license-filtered. Expert Q&A is not public opinion. Queries under three characters are marked not searched. |
| Bluesky AppView | Optional public social discussion | Researcher opts in; up to 25 indexed posts per phrase from seven days. Results are transient, exact repeated text is collapsed within a query, and high displayed-handle concentration is flagged. The feed is incomplete, author identity and independence are unverified, and language does not establish location. |
| Lemmy public instances | Optional federated forum discussion | Researcher opts in after reviewing each selected instance's terms/privacy and age rules. Instance searches are separate, capped, and may overlap through federation. Instance and language are not country samples. |

Queries and results are transient in the search page. Search providers receive the phrases needed for their requests and may process network/request data under their own terms. See the shipped [privacy notice](https://signal-scout-xi-ruby.vercel.app/privacy). Each result group shows its exact query, retrieval-start time, window, record status, and original links. Provider result counts are records only—not unique people, attention, sentiment, prevalence, or market behavior.

## Operational ingestion is separate from search

The deployment's scheduled or optional ingestion connectors can include Stack Exchange, Global Voices, The Conversation, European Commission Presscorner, Typst Forum, Fedora Discussion, Wikimedia talk-page metadata, and explicitly configured RSS or Korea MOIS feeds. These records feed protected operations and source monitoring; they are **not** automatically added to the public search response or a global-perspective count. Availability/configuration and recent connector health are shown on `/sources` when operational storage is configured. Ingested metadata is subject to separate retention and source-specific rights controls.

Do not describe these operational records as active search coverage unless a source is actually invoked by the visitor-facing search workflow. In particular, Wikimedia talk-page edits are editorial activity, not general market conversation.

## Retired, unavailable, or not implemented

- **GDELT live search:** retired after provider rate-limit/timeout failures; not a current search source.
- **Mastodon:** no current search UI. The old hashtag-only connector is not a general keyword search and must not be presented as active coverage.
- **Wikinews:** closed to new publishing; archived material is not current evidence.
- **YouTube comments:** not implemented; its API requires a key/quota and has additional policy constraints.
- **Reddit, X, Naver, and Kakao forums:** no current integration. Do not imply free public access or scrape around authentication, rate limits, or platform restrictions.
- **Automated country comparisons or thesis generation:** not supported. Atlas does not establish contributor geography, representative national views, sentiment, financial materiality, causality, or an investment conclusion.

## Evaluation checklist for a new source

Before adding a source, verify current official API behavior, account/key and cost requirements, terms and reuse rights, privacy/retention rules, rate limits, CORS/server routing, language and observable provenance, pagination/caps, date semantics, and failure behavior. Probe actual results for broad, ambiguous, and localized queries. Add the source only if the product can label what was observed and what was not; a reachable endpoint alone is not evidence of useful market coverage.
