import {afterEach,describe,expect,it,vi} from 'vitest';
import {fetchWithRetry,safeConnectorError} from './fetch';

afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});

describe('safe connector requests',()=>{
  it('retries a transient server response and then succeeds',async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response('ok',{status:200}));
    vi.stubGlobal('fetch',fetchMock);
    await expect(fetchWithRetry('https://example.test/feed',{},{attempts:2})).resolves.toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not retry access-denied responses',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response('',{status:403}));
    vi.stubGlobal('fetch',fetchMock);
    await expect(fetchWithRetry('https://example.test/feed?token=secret')).rejects.toThrow('HTTP_403');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('honors long Retry-After by stopping instead of retrying early',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response('',{status:429,headers:{'retry-after':'60'}}));
    vi.stubGlobal('fetch',fetchMock);
    await expect(fetchWithRetry('https://example.test/feed')).rejects.toThrow('RETRY_AFTER_WINDOW_EXCEEDED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('reduces errors to codes without leaking their message',()=>{
    expect(safeConnectorError(new Error('failed URL https://example.test/?token=secret'))).toBe('CONNECTOR_ERROR');
  });
});
