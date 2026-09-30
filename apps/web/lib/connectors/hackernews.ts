import {makeDocument} from './normalize';
import {fetchWithRetry} from './fetch';
import type {Connector,ConnectorResult} from './types';

const endpoint='https://hn.algolia.com/api/v1/search_by_date';
type SearchResponse={hits?:Array<{objectID?:string;story_id?:number;story_title?:string;story_url?:string;comment_text?:string;created_at?:string;author?:string}>};

/** Keyless public search over Hacker News comments; a narrow U.S.-leaning community sample. */
export class HackerNewsConnector implements Connector {
  name='hacker-news';
  validateConfiguration(){return {valid:true,errors:[]}}

  async fetchDocuments(input:Parameters<Connector['fetchDocuments']>[0]):Promise<ConnectorResult>{
    if(input.marketCode&&input.marketCode!=='US')return {documents:[],requestsUsed:0,metadata:{skipped:'Hacker News is used only as the U.S.-side sample'}};
    const queries=[...new Set(input.query.split(/\s+OR\s+/i).map(q=>q.trim()).filter(Boolean))].slice(0,3);
    const documents=[];
    for(const query of queries){
      const params=new URLSearchParams({query,tags:'comment',numericFilters:`created_at_i>=${Math.floor(input.start.getTime()/1000)},created_at_i<=${Math.floor(input.end.getTime()/1000)}`,hitsPerPage:'100'});
      const response=await fetchWithRetry(`${endpoint}?${params}`,{headers:{accept:'application/json'}});
      const body=await response.json() as SearchResponse;
      for(const hit of body.hits??[]){
        const id=hit.objectID??hit.story_id,text=plainText(hit.comment_text??'');
        if(!id||!text)continue;
        const sourceUrl=`https://news.ycombinator.com/item?id=${id}`;
        const title=hit.story_title?plainText(hit.story_title):text.slice(0,280);
        documents.push(makeDocument({companyId:input.companyId,marketCode:'US',sourceType:'hacker-news',sourceName:'Hacker News comment',sourceUrl,title,excerpt:text,publishedAt:hit.created_at,languageCode:'en',countryCode:'US',tier:4,entityConfidence:0,raw:{commentId:hit.objectID,storyUrl:hit.story_url,author:hit.author,query}}));
      }
    }
    const unique=[...new Map(documents.map(d=>[d.contentHash,d])).values()];
    return {documents:unique,requestsUsed:queries.length,metadata:{queries,resultCount:unique.length}};
  }
}

function plainText(value:string){return value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/gi,"'").replace(/\s+/g,' ').trim()}
