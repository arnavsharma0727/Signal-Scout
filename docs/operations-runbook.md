# Operations runbook

Inspect connector status, last successful run, freshness, quota, and errors before re-running. Use exponential backoff and stop when a budget is exhausted. Candidate expiry and cache cleanup are scheduled maintenance. If evidence decays, keep the record and mark it stale or insufficient rather than filling gaps. Redact secrets from logs and rotate compromised credentials immediately.
