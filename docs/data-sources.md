# Data sources

Optional connectors are disabled by default: user-provided APIs, documented free GDELT endpoints, official SEC EDGAR, supplied RSS/Atom feeds, and authorized Naver Search/DataLab APIs. For Korean conversation research, read [Korean source strategy](korean-source-strategy.md). Arbitrary HTML scraping, Google Trends, paywall circumvention, anti-bot bypasses, and unauthorized APIs are prohibited. Connector status and freshness are surfaced without revealing secrets.
# Current production status

The deployed collection consists of configured RSS/Atom feeds for Korean-language and U.S. news plus a limited Hacker News public-comment sample on the U.S. side. The sample is incomplete and is not representative. News and comment records are separate source classes and are not valid substitutes for matched country-level forum samples.

GDELT is currently disabled after HTTP 429 rate limiting. Bluesky is currently disabled after HTTP 403 responses. No Korean forum API/source is currently active. SEC EDGAR is not part of the current homepage evidence flow. Configuration, successful fetches, and permission to display full source text are separate questions; respect publisher/API terms and prefer linking out.
