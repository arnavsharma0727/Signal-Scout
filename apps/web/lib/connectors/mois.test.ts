import {afterEach,describe,expect,it,vi} from 'vitest';
import {MOISPressReleaseConnector} from './mois';

afterEach(()=>vi.unstubAllGlobals());

describe('MOIS official policy connector',()=>{
  it('stores only title, link, and date for article pages marked KOGL Type 1',async()=>{
    const fetchMock=vi.fn(async(input:RequestInfo|URL)=>{
      const url=String(input);
      if(url.includes('rss.jsp'))return new Response('<rss><channel><item><title>반도체 산업 정책</title><link>https://www.mois.go.kr/article/1</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item><item><title>무역 정책 안내</title><link>https://www.mois.go.kr/article/2</link><pubDate>Wed, 30 Sep 2026 11:00:00 GMT</pubDate></item></channel></rss>',{status:200});
      if(url.endsWith('/article/1'))return new Response('<html><body>공공누리 1유형(출처표시)<article>Full article text</article></body></html>',{status:200});
      return new Response('<html><body>공공누리 4유형</body></html>',{status:200});
    });
    vi.stubGlobal('fetch',fetchMock);
    const result=await new MOISPressReleaseConnector().fetchDocuments({query:'반도체 OR 무역',start:new Date('2026-09-29T00:00:00Z'),end:new Date('2026-10-01T00:00:00Z'),marketCode:'KR',languageCode:'ko'});
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({sourceType:'official-policy',sourceDomain:'www.mois.go.kr',titleOriginal:'반도체 산업 정책',languageCode:'ko',marketCode:'KR'});
    expect(result.documents[0].excerptOriginal).toBeUndefined();
    expect(result.documents[0].rawMetadata).toMatchObject({license:'KOGL-Type-1',attributionRequired:true,contentPolicy:'title-link-date-only'});
    expect(JSON.stringify(result.documents)).not.toContain('Full article text');
    expect(result.metadata.licenseRejected).toBe(1);
    expect(result.requestsUsed).toBe(3);
  });

  it('does not fetch articles whose titles do not match the bounded query',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response('<rss><channel><item><title>문화 행사 안내</title><link>https://www.mois.go.kr/article/1</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>',{status:200}));
    vi.stubGlobal('fetch',fetchMock);
    const result=await new MOISPressReleaseConnector().fetchDocuments({query:'반도체 OR 수출',start:new Date('2026-09-29T00:00:00Z'),end:new Date('2026-10-01T00:00:00Z')});
    expect(result.documents).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
