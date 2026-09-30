type CompactProfile = Record<string, any>;

const eventTerms = {
  KR: { earnings: ['실적', '분기 실적'], guidance: ['가이던스', '전망'], supply_chain: ['공급망', '납품'] },
  US: { earnings: ['earnings', 'quarterly results'], guidance: ['guidance', 'outlook'], supply_chain: ['supply chain', 'shipment'] },
} as const;

function marketProfile(profile: CompactProfile, marketCode: 'KR' | 'US') {
  const suffix = marketCode === 'KR' ? 'ko' : 'en';
  return {
    market_code: marketCode,
    language_code: suffix,
    company_aliases: profile[`market_aliases_${suffix}`] ?? [],
    negative_aliases: profile[`negative_aliases_${suffix}`] ?? [],
    products_games_apps_brands: profile[`product_aliases_${suffix}`] ?? [],
    competitor_aliases: [],
    event_terms: eventTerms[marketCode],
    source_preferences: [],
    ambiguity_notes: profile[`ambiguity_notes_${suffix}`] ?? [],
    enabled: profile.markets_enabled !== false,
  };
}

/** Expand the reviewed compact seed format into the full validated import contract. */
export function expandProfileSeed(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const profile = input as CompactProfile;
  if (Array.isArray(profile.markets)) return profile;
  if (!Array.isArray(profile.market_aliases_ko) || !Array.isArray(profile.market_aliases_en)) return profile;
  return {
    ...profile,
    aliases_en: profile.aliases_en ?? profile.market_aliases_en,
    aliases_ko: profile.aliases_ko ?? profile.market_aliases_ko,
    topics_of_interest: profile.topics_of_interest ?? [],
    related_entities: profile.related_entities ?? [],
    is_active: profile.is_active ?? true,
    priority_tier: profile.priority_tier ?? 2,
    cik: profile.cik ?? '',
    description: profile.description ?? '',
    krx_code: profile.krx_code ?? '',
    markets: [marketProfile(profile, 'KR'), marketProfile(profile, 'US')],
  };
}

export function expandProfileSeeds(input: unknown): unknown[] {
  const values = Array.isArray(input) ? input : [input];
  return values.map(expandProfileSeed);
}
