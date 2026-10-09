# Atlas search methodology and limits

Atlas is a discovery interface for current public discussion and reporting about a researcher-entered market interest. It is not a survey, sentiment score, market-attention measure, thesis generator, or recommendation engine.

## How retrieval works

The primary phrase is passed to each enabled provider using that provider's own search behavior and date window. Hacker News comments, Stack Exchange expert Q&A, Global Voices reporting, optional Bluesky posts, and optional Lemmy instances are returned as separate source groups. Stack Exchange is title-only and current CC BY-SA 4.0 items are required. Global Voices displays headline metadata only, even when its provider matches story text. Bluesky and Lemmy excerpts are transient and are not saved as search history.

Researchers may submit up to three alternate phrases explicitly. Atlas does not translate or infer them, and each one is shown with the exact query that produced it. The selected non-English Stack Exchange communities and Lemmy instances can use independent researcher-entered phrases. Exact double-quoted phrases are locally checked for adjacency by Hacker News and Stack Exchange filters; these filters do not make provider indexes equivalent.

Returned records are screened for required fields and provider-specific date bounds. Hacker News and Stack Exchange require every meaningful query token to appear in the returned text/title; quoted phrases require adjacent normalized tokens. Stack Exchange URLs must match the selected community host. Global Voices can match story bodies while returning only headlines, so Atlas applies an additional local filter requiring the meaningful query terms in the headline; body-only matches are omitted. These are lexical filters, not semantic relevance judgments, and they may miss relevant paraphrases or stories whose headline does not name the topic.

Each provider entry reports the query, search-start timestamp in UTC, applicable time window, results, and status. Each provider request is aborted after 12 seconds so one stalled endpoint cannot keep the entire sweep loading indefinitely. A completed empty search, provider failure/timeout, partial Global Voices edition availability, and a query not sent because it is too short for Stack Exchange remain distinct. When no international-language evidence appears, the overview now qualifies that statement according to whether multilingual reporting completed, was partial, or was unavailable. Citation IDs point from each overview highlight to one exact source entry. Open the original record before using an excerpt as evidence.

## How to interpret a result

The top section shows a small set of source excerpts or headlines—not a generated synthesis. We deliberately do not extract repeated n-grams as “themes”: generic wording can recur without conveying a useful or shared market view. Evidence classes are not pooled: general discussion is different from specialist Q&A, and both differ from journalism. Counts refer only to records returned under the displayed query, provider, date range, and retrieval conditions. They do not estimate unique people, attention, prevalence, belief, sentiment, or investor positioning.

No source language, platform, instance, community, or publisher edition establishes a contributor's country. English-language discussion is not a U.S. sample. Multiple publishers may repeat the same underlying claim, and multiple accounts may not represent independent people. Empty or incomplete results are not evidence that a view is absent.

## Research use and scope

For fundamental research, treat online conversation as a prompt to investigate a possible change, affected parties, transmission path, contradicting evidence, alternatives, and disconfirmation—not as proof of a business or valuation outcome. Verify important claims against primary materials such as company filings, official data, and earnings disclosures. Atlas currently does not establish causal impact, financial materiality, representative global views, a reliable national comparison, or an investment thesis.

The visitor-facing search does not store query history. Separate protected operational endpoints and scheduled source collection may store historical metadata in the service database. See the [privacy notice](https://signal-scout-xi-ruby.vercel.app/privacy) and [current source register](https://signal-scout-xi-ruby.vercel.app/sources) for operational details and current provider limits.
