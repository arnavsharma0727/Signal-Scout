# Source handling

Production ingestion stores records returned by individually enabled source connectors. Available metadata may include source name/domain, URL, publication time, market/language labels, title, excerpt, and connector metadata. Metadata completeness depends on the source; no unlicensed body text is retained.

Stack Exchange Economics, Money, Artificial Intelligence, Data Science, and Information Security plus Spanish-, Portuguese-, Japanese-, and Russian-language Stack Overflow are separate international expert Q&A communities. They are not general-purpose forum samples. The connector stores only per-item CC BY-SA 4.0 results with author, source, language, tags, and license attribution, and discards post bodies. First multilingual production ingestion stored 24 items in the rolling 24-hour view with no connector errors; the homepage displayed English, Spanish, and Russian items. GDELT is enabled for one global daily query but recent production requests still return HTTP 429 with no stored records. Bluesky is disabled following HTTP 403 responses. No Korean forum connector is active.

Do not infer source quality, permission to republish, or population representativeness solely from successful retrieval. Preserve attribution and links, minimize copied text, respect source terms and rate limits, and disable a source if the intended use is not permitted.
