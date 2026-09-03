/** Connector test contract: implementations must sanitize response samples and never log credentials. */
export type ConnectorStatus='live'|'unavailable'|'delayed'|'failed'|'budget-limited'|'not configured';
export interface Connector<TProfile,TQuery,TDocument>{get_status():Promise<ConnectorStatus>;validate_configuration():Promise<{valid:boolean;errors:string[]}>;estimate_query_cost(q:TQuery):number;get_documents(profile:TProfile,q:TQuery,start:Date,end:Date):Promise<TDocument[]>;get_primary_documents(profile:TProfile,start:Date,end:Date):Promise<TDocument[]>;get_cursor():Promise<unknown>;set_cursor(cursor:unknown):Promise<void>;get_metadata():Record<string,unknown>}
*** Add File: scripts/run_manual_ingestion.ts
/** Protected operator stub. Jobs must verify CRON_INTERNAL_SECRET and use configured connectors only. */
export function authorize(secret:string|undefined, expected:string|undefined){return Boolean(secret&&expected&&secret===expected)}
