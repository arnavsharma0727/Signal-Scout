# Company profile import

Start from the YAML or CSV template in `supabase/seed/company_profiles/` (or download the YAML template from the app). JSON is also accepted by the local importer. The profile format supports ticker/exchange, Korean legal/common name, KRX code, bilingual aliases, negative aliases, topics of interest, related-entity links with a relationship type and evidence note, and per-market/language terms.

Run `npm run import-profiles -- path/to/profiles.yaml` for validation only. Fix all warnings, especially missing Korean names for KR-enabled entities, short/ambiguous aliases, and duplicate/contradictory aliases. Apply only after review with `npm run import-profiles -- path/to/profiles.yaml --apply`; the command requires private Supabase server credentials. It upserts supplied company and market fields, preserves market profiles omitted from the file, and does not delete historical source documents or entity links.

Alias matching is literal and deterministic, not a probability. Negative aliases take precedence. The legacy `MARKET-TALK` profile is a macro context stream, not an entity, and its documents are not connected to company-level entity metrics. Do not activate a profile until aliases have been checked against false-positive examples.
