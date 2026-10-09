# Atlas search methodology and limits

Atlas discovers current public conversation around a researcher-entered market interest. It is not a survey, sentiment score, attention measure, causal model, thesis generator, or investment recommendation.

## Retrieval and comparison

Each search runs a bounded English-language baseline using Hacker News, Bluesky, `lemmy.world`, and the public Mastodon hashtag feed on `mastodon.social`. For a selected non-U.S. country lens, Atlas also searches Bluesky, four Lemmy instances, the selected Mastodon instance(s), and twelve Global Voices language editions. If AI assistance is enabled on the server and separately authorized by the visitor, the free Groq API translates the query and summarizes retrieved excerpts; otherwise the original phrase is used. All provider groups remain distinct and show their exact query, retrieval time, status, and source links below the overview. Results stay in page memory and are not written to search history.

The country selector offers the United States/English, South Korea/Korean, Japan/Japanese, Germany/German, France/French, Brazil/Portuguese, India/Hindi, and Spain/Spanish. These are language/community query lenses, not geolocation. Except for the selected query language and mapped public instances, provider records do not verify the author, audience, or market location. The English baseline is not a verified sample of U.S. residents.

Hacker News searches recent comments with a 30-day cap. Bluesky returns up to 25 indexed posts per query from seven days. Lemmy searches up to 20 recent posts per configured instance from seven days; federated posts may repeat. Mastodon searches up to 20 newest posts per instance through hashtag timelines, not arbitrary keyword search; untagged posts are missed. Global Voices returns matching headlines/links only, up to five per edition over 30 days. Search results are bounded and incomplete; provider outages and rate limits are shown per source.

## AI use and privacy

AI summaries use Groq's Free tier only; requests are opt-in, bounded, and sent server-side. The model receives no author handles or source URLs. Free-tier quotas can cause AI to be unavailable; the app then falls back to a locally assembled evidence overview. This summary is still not a representative survey, verified country opinion, or investment recommendation. Groq's [billing FAQ](https://console.groq.com/docs/billing-faqs) explains that moving to its Developer plan requires payment details; Atlas does not require or configure that paid plan.

## Interpretation

Returned counts are records, not unique people, public sentiment, prevalence, attention, investor positioning, or national opinion. Platform members, ranking systems, community languages, source caps, translations, and API indexing differ. Empty results do not establish absence. Verify material claims against primary information such as filings, official data, and company disclosures. Do not infer a financial conclusion from conversation volume alone.

The on-demand search is separate from protected scheduled ingestion, which may retain operational metadata in Supabase. See the [privacy notice](https://signal-scout-xi-ruby.vercel.app/privacy) and [source register](https://signal-scout-xi-ruby.vercel.app/sources).
