# API connector guide

User-provided sources require explicit mappings for title, source URL, publication timestamp, language, source name, excerpt/content, and optional domain/market. Configuration must include endpoint, auth type, headers, pagination, quota, rate limit, attribution, and field mappings. Test responses are sanitized; credentials are never logged. Incomplete mappings fail validation and ingest nothing.
