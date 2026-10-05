import { describe, expect, it, vi } from 'vitest';
import { isOAuthProviderEnabled } from './oauth-provider-status';

const config = {
  configured: true,
  url: 'https://project.supabase.co/',
  anonKey: 'publishable-test-key',
  provider: 'github' as const,
};

describe('isOAuthProviderEnabled', () => {
  it('returns true only when Supabase explicitly reports GitHub enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ external: { github: true } })));
    await expect(isOAuthProviderEnabled({ ...config, fetcher })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith('https://project.supabase.co/auth/v1/settings', expect.objectContaining({
      headers: { apikey: 'publishable-test-key' },
      cache: 'no-store',
    }));
  });

  it('fails closed for disabled providers, HTTP failures, and malformed settings', async () => {
    for (const response of [
      new Response(JSON.stringify({ external: { github: false } })),
      new Response('unavailable', { status: 503 }),
      new Response(JSON.stringify({ external: null })),
    ]) {
      await expect(isOAuthProviderEnabled({ ...config, fetcher: vi.fn().mockResolvedValue(response) })).resolves.toBe(false);
    }
  });

  it('does not make a request when app auth or credentials are unavailable', async () => {
    const fetcher = vi.fn();
    await expect(isOAuthProviderEnabled({ ...config, configured: false, fetcher })).resolves.toBe(false);
    await expect(isOAuthProviderEnabled({ ...config, anonKey: undefined, fetcher })).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
