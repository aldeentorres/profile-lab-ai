import {matchesDesignerSearch,type DesignerAgent} from "./designer-records.ts";

export type RawIqiAgent={id?:string|number;display_name?:string;full_name?:string;team_name?:string;ren_tag?:string;avatar_url?:string;avatar_original_url?:string;status?:string;branch_name?:string;designation?:string;slug?:string;email?:string};

const text=(value:unknown)=>typeof value==="string"?value.trim():typeof value==="number"?String(value):"";
export function normaliseIqiAgent(raw:RawIqiAgent):DesignerAgent{
 const id=text(raw.id),name=text(raw.display_name)||text(raw.full_name)||`Agent ${id||"unknown"}`,ren=text(raw.ren_tag).replace(/^REN\s*$/i,"");
 const candidate=text(raw.avatar_original_url)||text(raw.avatar_url),avatarUrl=/missing\.png(?:\?|$)/i.test(candidate)?"":candidate;
 return{agentId:id||text(raw.slug)||"unknown",name,teamName:text(raw.team_name)||"Unassigned",ren,avatarUrl,branch:text(raw.branch_name),designation:text(raw.designation),status:text(raw.status),...(text(raw.email)?{email:text(raw.email)}:{})};
}
export function slimAgent(agent:DesignerAgent):DesignerAgent{return{agentId:agent.agentId,name:agent.name,teamName:agent.teamName,ren:agent.ren,avatarUrl:agent.avatarUrl,branch:agent.branch,designation:agent.designation,status:agent.status,email:agent.email}}
export function matchAgents(agents:DesignerAgent[],query:string,limit=50){return agents.filter(agent=>matchesDesignerSearch(agent,query)).slice(0,limit)}
export function extractIqiAgents(payload:unknown):RawIqiAgent[]{if(Array.isArray(payload))return payload as RawIqiAgent[];if(!payload||typeof payload!=="object")return[];const record=payload as Record<string,unknown>;for(const key of ["data","agents","results"]){if(Array.isArray(record[key]))return record[key] as RawIqiAgent[]}return[]}
export function extractIqiMeta(payload:unknown){if(!payload||typeof payload!=="object")return{} as {count?:number;page?:number;per_page?:number;total_pages?:number};const record=payload as Record<string,unknown>,meta=(record.meta&&typeof record.meta==="object"?record.meta:record.pagination&&typeof record.pagination==="object"?record.pagination:{}) as Record<string,unknown>;return{count:Number(meta.count??meta.total_count??0)||undefined,page:Number(meta.page??meta.current_page??0)||undefined,per_page:Number(meta.per_page??0)||undefined,total_pages:Number(meta.total_pages??meta.pages??0)||undefined}}
