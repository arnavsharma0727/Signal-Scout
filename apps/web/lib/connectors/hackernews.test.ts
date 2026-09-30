import {afterEach,describe,expect,it,vi} from 'vitest';
import {HackerNewsConnector} from './hackernews';

afterEach(()=>vi.unstubAllGlobals());

describe('HackerNewsConnector',()=>{
  it('fetches public comments and maps them to U.S. market discussions',async()=>{
    const fetchMock=vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({hits:[{objectID:'comment1',story_id:123,story_title:'Market discussion',comment_text:'A public comment &amp; response',created_at:'2026-09-30T10:00:00.000Z',author:'reader'}]}),{status:200,headers:{'content-type':'application/json'}})));
    vi.stubGlobal('fetch',fetchMock);
    const result=await new HackerNewsConnector().fetchDocuments({query:'markets OR equities',start:new Date('2026-09-27T00:00:00Z'),end:new Date('2026-10-01T00:00:00Z'),marketCode:'US'});
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].marketCode).toBe('US');
    expect(result.documents[0].excerptOriginal).toBe('A public comment & response');
    expect(result.documents[0].sourceUrl).toBe('https://news.ycombinator.com/item?id=comment1');
  });

  it('does not mislabel this U.S.-centric source as Korean',async()=>{
    const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await new HackerNewsConnector().fetchDocuments({query:'equities',start:new Date(0),end:new Date(),marketCode:'KR'});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.documents).toHaveLength(0);
  });
});
