# Atlas source register

This describes the visitor-facing workflow in the current code. `/sources` is the live operational register; [data-sources.md](data-sources.md) documents search limits and privacy.

## Search providers

| Source | Product role | Scope and limitation |
| --- | --- | --- |
| Hacker News (Algolia) | English-language baseline conversation | Keyless comments, last 30 days, up to 20 matches. Technology-oriented and not a verified U.S. sample. |
| Bluesky AppView | Public social discussion | Keyless search, last seven days, up to 25 indexed posts per phrase. Language query is not author geolocation; results and excerpts are transient. |
| Lemmy instances | Public federated forum posts | Keyless query to `lemmy.world`, `discuss.tchncs.de`, `feddit.org`, and `jlai.lu`; up to 20 newest matching posts per instance in seven days. The visitor reviews applicable instance terms/privacy and age rules first. Federation may duplicate posts; no blanket reuse license is implied. |
| Mastodon instances | Public hashtag conversation | Keyless hashtag timeline, up to 20 newest posts per queried instance. This is not arbitrary keyword search; untagged discussion is missed. Instances can restrict public access. Terms and server information are reviewed before use. |
| Global Voices editions | International reporting context | Twelve language editions, headline metadata only, 30-day window and capped results. One publisher's editions are not independent forums or country samples. |

The form compares an English-language baseline with one selected country/language lens from eight options: U.S./English, South Korea/Korean, Japan/Japanese, Germany/German, France/French, Brazil/Portuguese, India/Hindi, and Spain/Spanish. These are query and community lenses, not verified contributor geographies. The product presents the English and selected-language summaries separately and lists sources beneath; it does not combine the international sample into one national-opinion estimate.

Optional AI translation and summaries use the Groq Free tier only when separately enabled and explicitly selected by a visitor. A server-side `GROQ_API_KEY` is required; never configure paid billing or add payment details. Without it, Atlas displays a local evidence overview. See Groq's [billing FAQ](https://console.groq.com/docs/billing-faqs) and the [privacy notice](https://signal-scout-xi-ruby.vercel.app/privacy).

## Operational ingestion is separate

Scheduled or optional ingestion may include Stack Exchange, Global Voices, The Conversation, European Commission Presscorner, Typst Forum, Fedora Discussion, Wikimedia talk-page metadata, or explicitly configured RSS/MOIS feeds. These operational records are not automatically part of the public search response or the country comparison. Ingested metadata has separate retention and rights controls.

## Not active in visitor search

- GDELT live search is retired after provider rate-limit/timeout failures.
- Stack Exchange remains an operational specialist Q&A source but is not included in this focused conversation search.
- Wikinews is archived, not a current source.
- YouTube comments are not implemented; API keys, quotas, and additional policy requirements apply.
- Reddit, X, Naver, and Kakao forum search are not integrated. Do not scrape around access controls, terms, or rate limits.
