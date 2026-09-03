# Company profile import

Start from the blank YAML or CSV template in `supabase/seed/company_profiles/`. JSON is also accepted by the protected local importer. Run a dry validation before upsert. Required fields are ticker, company name, exchange, supported vertical, and an enabled market/language with an alias and event or product terms. The importer reports errors, warnings, completeness, and upsert history. It never guesses missing values and never deletes historical records.
