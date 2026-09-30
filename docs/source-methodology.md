# Source handling

Production ingestion stores records returned by individually enabled source connectors. Available metadata may include source name/domain, URL, publication time, market/language labels, title, excerpt, and connector metadata. Metadata completeness depends on the source; no unlicensed body text is retained.

Stack Exchange Economics, Money, Artificial Intelligence, Data Science, and Information Security are separate international English Q&A sources. They are not country-level or general-purpose forum samples and do not support a direct Korea/U.S. conversation-frequency comparison. The connector stores only per-item CC BY-SA 4.0 results with author, source, and license attribution, and discards post bodies. GDELT is disabled following HTTP 429 responses; Bluesky is disabled following HTTP 403 responses. No Korean forum connector is active.

Do not infer source quality, permission to republish, or population representativeness solely from successful retrieval. Preserve attribution and links, minimize copied text, respect source terms and rate limits, and disable a source if the intended use is not permitted.
