export class SourceRequestError extends Error {
  constructor(readonly sourceCode:string){super(`Source request failed (${sourceCode})`);this.name='SourceRequestError'}
}

/** Bounded GET retries for transport failures, 408, 429 and 5xx. Never logs URL/body. */
export async function fetchWithRetry(url:string|URL,init:RequestInit={},options:{attempts?:number;timeoutMs?:number}={}){
  const attempts=options.attempts??3,timeoutMs=options.timeoutMs??20000;
  for(let attempt=1;attempt<=attempts;attempt++){
    let response:Response|undefined;
    try{
      response=await fetch(url,{...init,signal:AbortSignal.timeout(timeoutMs)});
      if(response.ok)return response;
      const retryable=response.status===408||response.status===429||response.status>=500;
      if(!retryable||attempt===attempts)throw new SourceRequestError(`HTTP_${response.status}`);
    }catch(error){
      if(error instanceof SourceRequestError)throw error;
      if(attempt===attempts)throw new SourceRequestError('NETWORK_OR_TIMEOUT');
    }
    const retryAfter=response?.headers.get('retry-after');
    const seconds=retryAfter?Number(retryAfter):NaN;
    const retryDate=retryAfter&&!Number.isFinite(seconds)?Date.parse(retryAfter):NaN;
    const requestedDelay=Number.isFinite(seconds)?Math.max(0,seconds*1000):Number.isFinite(retryDate)?Math.max(0,retryDate-Date.now()):250*2**(attempt-1);
    if(requestedDelay>10000)throw new SourceRequestError('RETRY_AFTER_WINDOW_EXCEEDED');
    const delay=requestedDelay;
    await new Promise(resolve=>setTimeout(resolve,delay));
  }
  throw new SourceRequestError('RETRY_EXHAUSTED');
}

export function safeConnectorError(error:unknown){
  if(error instanceof SourceRequestError)return error.sourceCode;
  if(error instanceof Error)return error.name==='Error'?'CONNECTOR_ERROR':`CONNECTOR_${error.name.replace(/[^A-Za-z0-9_-]/g,'').slice(0,40).toUpperCase()}`;
  return 'CONNECTOR_UNKNOWN_ERROR';
}
