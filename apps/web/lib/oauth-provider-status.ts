type OAuthProvider = 'github';

/** Read the public Supabase Auth settings and fail closed unless the provider is explicitly enabled. */
export async function isOAuthProviderEnabled(input: {
  configured: boolean;
  url?: string;
  anonKey?: string;
  provider: OAuthProvider;
  fetcher?: typeof fetch;
}): Promise<boolean> {
  if (!input.configured || !input.url || !input.anonKey) return false;
  try {
    const response = await (input.fetcher ?? fetch)(
      `${input.url.replace(/\/$/, '')}/auth/v1/settings`,
      {
        headers: { apikey: input.anonKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== 'object' || !('external' in settings)) return false;
    const providers = settings.external;
    return Boolean(
      providers &&
      typeof providers === 'object' &&
      input.provider in providers &&
      providers[input.provider] === true,
    );
  } catch {
    return false;
  }
}
