import {normalizeAlias} from './profile';

export type AliasSet={positive:string[];negative?:string[]};
export type AliasMatch={matched:boolean;alias?:string;blockedBy?:string};

/** Literal, auditable matching only; it deliberately does not invent a probability. */
export function matchEntityText(text:string,aliases:AliasSet):AliasMatch{
  const normalizedText=normalizeAlias(text);
  const negatives=(aliases.negative??[]).find(alias=>containsAlias(normalizedText,alias));
  if(negatives)return {matched:false,blockedBy:negatives};
  const alias=aliases.positive.find(value=>containsAlias(normalizedText,value));
  return alias?{matched:true,alias}:{matched:false};
}

function containsAlias(text:string,value:string){
  const alias=normalizeAlias(value);
  if(!alias||alias.length<2)return false;
  // Hangul is naturally space-delimited inconsistently in headlines; use a literal substring.
  if(/[\uac00-\ud7af]/u.test(alias))return text.includes(alias);
  // Latin/mixed aliases must be whole tokens so short symbols do not match inside words.
  const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,'u').test(text);
}
