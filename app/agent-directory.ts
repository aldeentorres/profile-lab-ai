import {matchesDesignerSearch,type DesignerAgent} from "./designer-records.ts";

export type RawIqiAgent={id?:string|number;gender?:string;display_name?:string;full_name?:string;team_name?:string;ren_tag?:string;avatar_url?:string;avatar_original_url?:string;status?:string;branch_name?:string;designation?:string;slug?:string;email?:string};

export type AgentPresentation="male"|"female";
// The reminder email shows an example portrait matching the agent's own presentation, so the example
// reads as "a photo like yours" instead of a stranger. IQI carries gender on some records; when it does
// not, only an honorific or a Malay binti/bin patronymic is a dependable signal, so the given-name list
// stays short and anything unrecognised falls back to the male example rather than guessing.
const femaleTitle=/\s(puan|cik|datin|madam|mdm|mrs|ms|miss)\.?\s/,femalePatronymic=/\s(binti|bt|bte)\s/;
const femaleGivenNames=new Set(["siti","nur","nurul","noor","nor","aina","ain","aisyah","farah","fatimah","hafizah","izzati","liyana","maisarah","nadia","nabila","najwa","sofia","syafiqah","zarina","maya","sarah","sara","jasmine","joyce","michelle","grace","emily","karen","lisa","anita","sunita","priya","kavitha","devi","shanti","lakshmi"]);
export function agentPresentation(name:string,declared=""):AgentPresentation{
 const stated=declared.trim().toLowerCase();
 if(stated.startsWith("f")||stated==="woman")return "female";
 if(stated.startsWith("m")||stated==="man")return "male";
 const padded=` ${name.trim().toLowerCase().replace(/[^a-z\s]/g," ").replace(/\s+/g," ")} `;
 if(femalePatronymic.test(padded)||femaleTitle.test(padded))return "female";
 return femaleGivenNames.has(padded.trim().split(" ")[0]??"")?"female":"male";
}
const text=(value:unknown)=>typeof value==="string"?value.trim():typeof value==="number"?String(value):"";
export function isMissingAvatarUrl(url:string){return !url.trim()||/missing\.png(?:\?|$)/i.test(url.trim())}
export function normaliseIqiAgent(raw:RawIqiAgent):DesignerAgent{
 const id=text(raw.id),name=text(raw.display_name)||text(raw.full_name)||`Agent ${id||"unknown"}`,ren=text(raw.ren_tag).replace(/^REN\s*$/i,"");
 const candidate=text(raw.avatar_original_url)||text(raw.avatar_url),avatarUrl=isMissingAvatarUrl(candidate)?"":candidate;
 return{agentId:id||text(raw.slug)||"unknown",name,teamName:text(raw.team_name)||"Unassigned",ren,avatarUrl,gender:agentPresentation(name,text(raw.gender)),branch:text(raw.branch_name),designation:text(raw.designation),status:text(raw.status),...(text(raw.email)?{email:text(raw.email)}:{})};
}
export function slimAgent(agent:DesignerAgent):DesignerAgent{return{agentId:agent.agentId,name:agent.name,gender:agent.gender,teamName:agent.teamName,ren:agent.ren,avatarUrl:agent.avatarUrl,branch:agent.branch,designation:agent.designation,status:agent.status,email:agent.email}}
export function matchAgents(agents:DesignerAgent[],query:string,limit=50){return agents.filter(agent=>matchesDesignerSearch(agent,query)).slice(0,limit)}
export function extractIqiAgents(payload:unknown):RawIqiAgent[]{if(Array.isArray(payload))return payload as RawIqiAgent[];if(!payload||typeof payload!=="object")return[];const record=payload as Record<string,unknown>;for(const key of ["data","agents","results"]){if(Array.isArray(record[key]))return record[key] as RawIqiAgent[]}return[]}
export function extractIqiMeta(payload:unknown){if(!payload||typeof payload!=="object")return{} as {count?:number;page?:number;per_page?:number;total_pages?:number};const record=payload as Record<string,unknown>,meta=(record.meta&&typeof record.meta==="object"?record.meta:record.pagination&&typeof record.pagination==="object"?record.pagination:{}) as Record<string,unknown>;return{count:Number(meta.count??meta.total_count??0)||undefined,page:Number(meta.page??meta.current_page??0)||undefined,per_page:Number(meta.per_page??0)||undefined,total_pages:Number(meta.total_pages??meta.pages??0)||undefined}}
