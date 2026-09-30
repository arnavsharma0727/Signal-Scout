import {XMLParser} from 'fast-xml-parser';
import {fetchWithRetry} from './fetch';
import {makeDocument} from './normalize';
import type {Connector,ConnectorResult} from './types';

export const MOIS_PRESS_RELEASE_FEED='https://www.mois.go.kr/gpms/view/jsp/rss/rss.jsp?ctxCd=1012';
const MOIS_HOSTS=new Set(['mois.go.kr','www.mois.go.kr']);
const MAX_FEED_BYTES=3_000_000;
const MAX_ARTICLES_TO_VERIFY=5;

/** Official policy context only; it is deliberately not classified as discussion/news sentiment. */
export class MOISPressReleaseConnector implements Connector {
  name='mois-official-policy';
  validateConfiguration(){return {valid:true,errors:[]};}

  async fetchDocuments(input:Parameters<Connector['fetchDocuments']>[0]):Promise<ConnectorResult>{
    const feed=await fetchWithRetry(MOIS_PRESS_RELEASE_FEED,{headers:{accept:'application/rss+xml, application/xml'}});
    const xml=await feed.text();
    if(Buffer.byteLength(xml,'utf8')>MAX_FEED_BYTES)throw new Error('MOIS RSS response exceeded size limit');
    const parsed=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'}).parse(xml) as Record<string,any>;
    const channel=parsed.rss?.channel;
    const raw=channel?.item??[];
    const items=(Array.isArray(raw)?raw:[raw]).flatMap((item:any)=>{
      const link=typeof item.link==='string'?item.link:item.link?.['@_href'];
      const title=typeof item.title==='string'?item.title:item.title?.['#text'];
      const dateValue=item.pubDate??item.published??item.updated;
      const date=dateValue?new Date(dateValue):null;
      if(!link||!title||!date||!Number.isFinite(date.getTime())||date<input.start||date>input.end)return [];
      const titleText=String(title).trim();
      const terms=input.query.split(/\s+OR\s+/i).map(term=>term.trim()).filter(Boolean);
      if(!terms.some(term=>titleText.toLocaleLowerCase().includes(term.toLocaleLowerCase())))return [];
      try{
        const url=new URL(String(link),MOIS_PRESS_RELEASE_FEED);
        if(url.protocol!=='https:'||!MOIS_HOSTS.has(url.hostname.toLocaleLowerCase()))return [];
        return [{url:url.toString(),title:titleText,publishedAt:date.toISOString()}];
      }catch{return []}
    }).slice(0,MAX_ARTICLES_TO_VERIFY);

    const documents:ReturnType<typeof makeDocument>[]=[];
    let verifiedRequests=0,licenseRejected=0;
    for(const item of items){
      const article=await fetchWithRetry(item.url,{headers:{accept:'text/html,application/xhtml+xml'},redirect:'manual'});
      verifiedRequests++;
      const finalUrl=new URL(article.url||item.url);
      if(!MOIS_HOSTS.has(finalUrl.hostname.toLocaleLowerCase())){licenseRejected++;continue}
      const html=await article.text();
      if(Buffer.byteLength(html,'utf8')>MAX_FEED_BYTES||!hasKoglTypeOne(html)){licenseRejected++;continue}
      documents.push(makeDocument({
        marketCode:'KR',countryCode:'KR',languageCode:'ko',sourceType:'official-policy',sourceName:'Korea MOIS press release',
        sourceUrl:finalUrl.toString(),title:item.title,publishedAt:item.publishedAt,tier:1,entityConfidence:0,
        raw:{license:'KOGL-Type-1',attributionRequired:true,contentPolicy:'title-link-date-only',publisher:'Ministry of the Interior and Safety, Republic of Korea'},
      }));
    }
    return {documents,requestsUsed:1+verifiedRequests,metadata:{feed:'MOIS official press releases',itemsInWindow:items.length,licenseVerified:documents.length,licenseRejected,contentStored:'title-link-date-only',notInvestorDiscussion:true}};
  }
}

function hasKoglTypeOne(html:string){
  const text=html.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
  return /공공누리\s*1유형/.test(text);
}
