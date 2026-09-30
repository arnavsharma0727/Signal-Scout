import {XMLParser} from 'fast-xml-parser';
import {makeDocument} from './normalize';
import {fetchWithRetry} from './fetch';
import type {Connector,ConnectorResult} from './types';

export class RSSConnector implements Connector {
  name='rss';
  constructor(private feeds:string[]){}
  validateConfiguration(){
    const invalid=this.feeds.some(value=>{try{return !['http:','https:'].includes(new URL(value).protocol)}catch{return true}});
    const errors=invalid?['Invalid RSS URL']:this.feeds.length?[]:['No RSS feeds configured'];
    return {valid:errors.length===0,errors};
  }
  async fetchDocuments(input:Parameters<Connector['fetchDocuments']>[0]):Promise<ConnectorResult>{
    const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'});
    const documents:ReturnType<typeof makeDocument>[]=[];
    const failures:string[]=[];let requestsUsed=0;
    for(const feed of this.feeds){
      let feedDomain='unknown';
      try{
        feedDomain=new URL(feed).hostname;
        const response=await fetchWithRetry(feed,{headers:{accept:'application/rss+xml, application/atom+xml, application/xml'}});
        requestsUsed++;
        const parsed=parser.parse(await response.text()) as Record<string,any>;
        const channel=parsed.rss?.channel??parsed.feed;
        const rawItems=channel?.item??channel?.entry??[];
        const items=Array.isArray(rawItems)?rawItems:[rawItems];
        for(const item of items){
          const link=typeof item.link==='string'?item.link:item.link?.['@_href'];
          const title=typeof item.title==='string'?item.title:item.title?.['#text'];
          if(!link||!title)continue;
          let sourceUrl:string;
          try{sourceUrl=new URL(String(link),response.url||feed).toString();if(!['http:','https:'].includes(new URL(sourceUrl).protocol))continue}catch{continue}
          const published=item.pubDate??item.published??item.updated;
          const parsedDate=published?new Date(published):undefined;
          const date=parsedDate&&!Number.isNaN(parsedDate.getTime())?parsedDate:undefined;
          if(date&&(date<input.start||date>input.end))continue;
          const description=item.description??item.summary??item.content;
          documents.push(makeDocument({companyId:input.companyId,marketCode:input.marketCode,sourceType:'rss',sourceName:new URL(sourceUrl).hostname,sourceUrl,title:String(title),excerpt:typeof description==='string'?description:undefined,publishedAt:date?.toISOString(),languageCode:input.languageCode,countryCode:input.marketCode,tier:1,entityConfidence:0,raw:{feedDomain}}));
        }
      }catch(error){failures.push(`${feedDomain}:${error instanceof Error?error.message:'failed'}`)}
    }
    if(!requestsUsed&&failures.length)throw new Error('All RSS feeds failed');
    return {documents,requestsUsed:this.feeds.length,metadata:{feeds:this.feeds.length,successfulFeeds:requestsUsed,failedFeeds:failures.map(value=>value.split(':')[0]),resultCount:documents.length}};
  }
}
