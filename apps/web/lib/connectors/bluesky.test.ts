import {afterEach,describe,expect,it,vi} from 'vitest';
import {BlueskyConnector} from './bluesky';

afterEach(()=>vi.unstubAllGlobals());

describe('BlueskyConnector',()=>{
  it('searches public posts, normalizes links, and caps alias fan-out',async()=>{
    const fetchMock=vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({posts:[{uri:'at://did:plc:test/app.bsky.feed.post/post123',indexedAt:'2026-09-30T12:00:00Z',author:{handle:'researcher.bsky.social'},record:{text:'Korean market discussion',createdAt:'2026-09-30T11:00:00Z'}}]}),{status:200,headers:{'content-type':'application/json'}})));
    vi.stubGlobal('fetch',fetchMock);
    const result=await new BlueskyConnector().fetchDocuments({query:'Samsung OR Apple OR Nvidia OR SK hynix',start:new Date('2026-09-27T00:00:00Z'),end:new Date('2026-09-30T23:59:59Z'),languageCode:'ko',marketCode:'KR'});

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.requestsUsed).toBe(3);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].sourceUrl).toBe('https://bsky.app/profile/researcher.bsky.social/post/post123');
    expect(result.documents[0].sourceType).toBe('bluesky');
    const calledUrl=new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('lang')).toBe('ko');
  });
});
