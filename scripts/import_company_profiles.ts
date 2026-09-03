/** Protected local import entry point. Parsing adapters should call validateProfile before server-side upsert. */
import { validateProfile } from './validate_company_profiles';
export function dryRun(profiles:unknown[]){return profiles.map(validateProfile)}
console.log('Signal Scout profile importer: provide real YAML, CSV, or JSON profiles; dry-run validation is required before upsert.');
