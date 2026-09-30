import {afterEach,describe,expect,it,vi} from 'vitest';
import {RSSConnector} from './rss';

afterEach(()=>vi.unstubAllGlobals());

describe('RSS connector provenance',()=>{
  it('resolves relative publisher links and does not retain feed query secrets',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response('<rss><channel><item><title>Headline</title><link>/article/1</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>',{status:200}));
    vi.stubGlobal('fetch',fetchMock);
    const result=await new RSSConnector(['https://feed.example/rss?token=private']).fetchDocuments({query:'topic',start:new Date('2026-09-29T00:00:00Z'),end:new Date('2026-10-01T00:00:00Z')});
    expect(result.documents[0].sourceUrl).toBe('https://feed.example/article/1');
    expect(result.documents[0].sourceDomain).toBe('feed.example');
    expect(result.documents[0].rawMetadata).toEqual({feedDomain:'feed.example'});
    expect(JSON.stringify(result.documents[0])).not.toContain('private');
  });

  it('accepts only HTTP(S) feed endpoints',()=>{
    expect(new RSSConnector(['file:///etc/passwd']).validateConfiguration().valid).toBe(false);
  });
});
