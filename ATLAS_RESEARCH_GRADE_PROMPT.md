# Atlas Research-Quality Product Brief

You are the product engineer responsible for making Atlas a trustworthy global conversation-discovery tool for fundamental researchers. The product is a search engine for market interests—not a stock screener, trading signal, investment recommendation, social-media popularity chart, or automated thesis generator.

## Objective

For any researcher-entered market topic, retrieve current, permitted public discussion and relevant reporting across available languages and communities; present a concise, honest overview of what the retrieved sample actually says; and let the researcher inspect every supporting original source in one clearly organized citations section. A researcher must be able to tell what was searched, what was not searched, when the sample applies, and why each overview point is shown.

## Non-negotiable evidence standards

- Never call language, server, publisher edition, or inferred location a national sample. Label views by the observable property (language, platform, community, publisher). Never imply that English means U.S. or that a foreign-language source represents a country.
- Keep discussion, expert Q&A, journalism, and institutional sources distinct. Do not pool their counts or present them as interchangeable opinions.
- Do not describe returned-record counts as people, market attention, sentiment, prevalence, or investor belief. Deduplicate syndicated/reposted material where defensible and disclose when independence is unknown.
- Do not invent a summary, consensus, stance, country view, causal explanation, or business impact. Any synthesis must be traceable to exact returned records and distinguish direct evidence from interpretation. If a source has only a headline/title, label it as such; do not imply article-body review.
- Put readable overviews before citations. Keep raw links, titles, publishers/communities, language, timestamps, query/window, and provider status together in a later “Sources & citations” section. Give every overview point a compact reference ID that resolves to exactly one source entry below; do not make the overview itself a wall of hyperlinks.
- Mark no results, partial coverage, query rejection, provider failure, and unsearched sources as different states. Never convert an unavailable provider into an empty result.
- Search should be precise enough to reject obvious lexical false positives. Support exact phrases, aliases, ticker/company ambiguity, spelling variants, and researcher-entered local-language equivalents without silently translating or broadening the query. Expose expansions so researchers can correct them.
- Show the time window and search-as-of time for each provider. Preserve source-native timestamps and timezone meaning. Make repeated searches explainably comparable only when provider, query, window, and retrieval conditions match.
- Protect people and content: follow source terms, licensing, deletion/takedown, privacy, retention, rate limits, and attribution requirements. Prefer link-only metadata when storage/display rights are unclear; never bypass access controls or scrape private/restricted spaces.

## Fundamental-research usefulness

For each topic, help the researcher ask: what changed; who or what may be affected; what is the plausible transmission path to demand, pricing, costs, supply, margins, capex, regulation, or competitive position; what contradicts the interpretation; what alternative explanations fit; and what evidence would disconfirm it? Atlas may organize those questions, but must not turn discussion into a financial conclusion without independent evidence. Relevant primary evidence may include filings, earnings materials, official data, and source-linked reporting, clearly separated from conversation.

## Product shape and pruning

- Keep the first screen to the Atlas brand, one search field, and its attribution. Results should prioritize overview, coverage caveats, and citations—in that order.
- Keep only workflows that directly support search, source transparency, privacy, legal compliance, or reliability. Audit every route, component, connector, schema, and dependency before removal. Remove unused or misleading user-facing features with safe redirects where appropriate; do not delete user data, migrations, credentials, or useful ingestion silently.
- Retire dormant sources from active UI and claims. Keep operational/admin routes private and protected. Do not add tabs, dashboards, ticker watchlists, briefs, or scoring unless they directly improve the search task and the researcher explicitly needs them.
- Keep controls progressive: advanced language/community/provider selection belongs behind a simple refinement control, with clear terms and limitations.

## Required implementation and acceptance checks

1. Trace every overview statement/reference to an exact citation; verify the citation link opens the original item and its publisher/community metadata matches.
2. Add tests for lexical false positives, aliases, multilingual terms, duplicate sources, stale/future records, unavailable providers, no-results states, and citation-to-overview mapping.
3. Test with representative broad and ambiguous queries (including tickers/common words) and at least one researcher-supplied local-language query. Record the exact searched providers and observed failures; do not claim worldwide coverage from a few sources.
4. Inspect desktop and mobile layouts for a readable overview, clear source separation, keyboard/accessibility support, visible timestamps, and no overflow or misleading geographic language.
5. Verify secrets remain server-side, no private content is collected, API failure/rate limiting is handled, and source policy/takedown behavior remains intact.
6. Run the full test suite, typecheck, production build, and production smoke checks. Report what was actually verified, remaining coverage gaps, and every removed route/component. Never mark the product complete merely because the UI looks finished.

## Current known gaps to resolve

Already implemented: overview excerpts carry stable citation IDs that map to exact source entries; each source reports its submitted query, UTC search-start time, window, and distinct complete/partial/unavailable/not-searched state; Hacker News and Stack Exchange apply local all-term and quoted-phrase checks; Global Voices filters headline-only output against the query; researchers can submit explicit alternate phrases; short Stack Exchange queries no longer abort other providers; public-source requests have a 12-second per-request timeout; an empty international overview distinguishes a completed empty search from unavailable or partial reporting; known display-language names are converted to valid HTML language tags for assistive technology; Bluesky is optional and labeled, hides provider-labeled previews, collapses exact repeated text with repeat counts, and flags a sample concentrated in one displayed handle. Live-query testing exposed generic repeated n-grams, so that pseudo-theme feature was removed; the overview is restricted to citation-linked source material. The methodology and source register describe the actual focused search separately from protected scheduled ingestion.

Still unresolved: the overview is a small selection of raw excerpts/headlines, not a synthesized thematic summary. Lexical filters can admit semantically irrelevant matches or miss paraphrases, translations, aliases, spelling variants, and ticker/company ambiguity. Global Voices body-only matches are deliberately omitted because the article body is not retrieved. Exact-repeat suppression applies only within a Bluesky query; syndicated/copied claims across providers are not semantically deduplicated, and authorship/independence are unverified. Active sources remain few, selected, language-skewed, platform-biased, capped, and sometimes empty or unavailable; the interface cannot currently support a representative US-versus-global comparison. Global Voices rate limiting is process-local best effort, not a shared production quota; upgrading it needs a reliable shared store and corresponding production configuration. Search providers receive submitted phrases and may process request/network data under their own policies. Atlas does not establish contributor geography, population sentiment, source independence, financial materiality, causality, or a link to company fundamentals. A narrow mobile viewport could not be programmatically set in the available browser QA session, so mobile layout remains unverified beyond the authored responsive CSS. Keep these limits visible; do not mask them with stronger branding, invented synthesis, or higher record counts.
