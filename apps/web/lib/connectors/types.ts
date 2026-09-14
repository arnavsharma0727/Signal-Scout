export type SourceTier=1|2|3|4|5;
export type NormalizedDocument={
  companyId?:string; marketCode?:string; countryCode?:string; sourceType:string; sourceName:string;
  sourceDomain:string; languageCode?:string; titleOriginal:string; excerptOriginal?:string;
  sourceUrl:string; canonicalUrl:string; publishedAt?:string; sourceQualityTier:SourceTier;
  entityMatchConfidence:number; contentHash:string; rawMetadata:Record<string,unknown>;
};
export type ConnectorResult={documents:NormalizedDocument[]; requestsUsed:number; metadata:Record<string,unknown>};
export interface Connector { name:string; validateConfiguration():{valid:boolean;errors:string[]}; fetchDocuments(input:{query:string;start:Date;end:Date;marketCode?:string;languageCode?:string;companyId?:string}):Promise<ConnectorResult>; }
