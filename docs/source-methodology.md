# Source handling

Production ingestion stores records returned by configured public RSS/Atom feeds and the Hacker News API. Available metadata may include source name/domain, URL, publication time, market/language labels, title, excerpt/comment text, and connector metadata. Metadata completeness depends on the source.

Korean-language RSS and U.S. RSS are news sources; Hacker News is a separate U.S.-leaning public discussion source. The current inputs are not matched forum samples and do not support a direct Korea/U.S. conversation-frequency comparison. GDELT is disabled following HTTP 429 responses; Bluesky is disabled following HTTP 403 responses. No Korean forum connector is active.

Do not infer source quality, permission to republish, or population representativeness solely from successful retrieval. Preserve attribution and links, minimize copied text, respect source terms and rate limits, and disable a source if the intended use is not permitted.
