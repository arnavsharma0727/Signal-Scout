import {makeDocument} from './normalize';
import type {Connector,ConnectorResult} from './types';

const endpoint='https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts';
type SearchResponse={posts?:Array<{uri?:string;indexedAt?:string;author?:{handle?:string};record?:{text?:string;createdAt?:string}}>};

/** Public, unauthenticated Bluesky search; public posts are not a representative forum sample. */
export class BlueskyConnector implements Connector {
  name='bluesky';
  validateConfiguration(){return {valid:true,errors:[]}}

  async fetchDocuments(input:Parameters<Connector['fetchDocuments']>[0]):Promise<ConnectorResult>{
    const queries=[...new Set(input.query.split(/\s+OR\s+/i).map(q=>q.trim()).filter(Boolean))].slice(0,3);
    const documents=[];
    for(const query of queries){
      const params=new URLSearchParams({q:query,limit:'100',sort:'latest'});
      if(input.languageCode)params.set('lang',input.languageCode);
      const response=await fetch(`${endpoint}?${params}`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`Bluesky returned ${response.status}`);
      const body=await response.json() as SearchResponse;
      for(const post of body.posts??[]){
        const text=post.record?.text?.trim(),handle=post.author?.handle,rkey=post.uri?.split('/').at(-1);
        if(!text||!handle||!rkey)continue;
        const publishedAt=post.record?.createdAt??post.indexedAt;
        if(publishedAt){const time=Date.parse(publishedAt);if(!Number.isNaN(time)&&(time<input.start.getTime()||time>input.end.getTime()))continue}
        const url=`https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`;
        documents.push(makeDocument({companyId:input.companyId,marketCode:input.marketCode,sourceType:'bluesky',sourceName:'Bluesky public posts',sourceUrl:url,title:text.slice(0,280),excerpt:text,publishedAt,languageCode:input.languageCode,countryCode:input.marketCode,tier:4,entityConfidence:.45,raw:{uri:post.uri,handle,indexedAt:post.indexedAt,query}}));
      }
    }
    const unique=[...new Map(documents.map(d=>[d.contentHash,d])).values()];
    return {documents:unique,requestsUsed:queries.length,metadata:{queries,resultCount:unique.length}};
  }
}
