// Daily cap on "Generate AI Portrait": every generative backend behind it costs something — a Puter
// account's own quota, or a metered OpenAI/Gemini key — so the count is per agent and resets at local
// midnight. It is charged only when a call actually reaches one of those backends (the caller passes the
// agent's id after a generative result comes back, never after a run that fell back to the free on-device
// pipeline — that never touched a paid backend and must not spend the allowance). The always-free manual
// editor and "keep original, request designer approval" paths are untouched — an agent who has used
// today's AI generations can still finish the photo journey, just not through this button again until
// tomorrow.
// TEMPORARILY UNLIMITED while Puter generation is being tested — restore to 2 to re-enable the daily cap.
export const aiGenerationDailyCap=Infinity;
const storageKey="studio-ai-generation-limit";
type LimitRecord={date:string;count:number};

// The device's own calendar day, not UTC: a kiosk resets at local midnight, the way an agent would expect.
function localDateKey(){
 const now=new Date();
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function readAll():Record<string,LimitRecord>{
 try{
  const raw=localStorage.getItem(storageKey);
  return raw?JSON.parse(raw) as Record<string,LimitRecord>:{};
 }catch{return {}}
}

function writeAll(all:Record<string,LimitRecord>){
 try{localStorage.setItem(storageKey,JSON.stringify(all))}catch{/* a full or unavailable store must never block generation */}
}

export function aiGenerationsUsedToday(agentId:string):number{
 const entry=readAll()[agentId];
 return entry&&entry.date===localDateKey()?entry.count:0;
}

export function aiGenerationsRemainingToday(agentId:string):number{
 return Math.max(0,aiGenerationDailyCap-aiGenerationsUsedToday(agentId));
}

// Records one use and returns the count remaining after it. Called once per Generate click, before the
// attempt runs, so a click always spends an allowance whether the result comes from a real generative
// backend or the local fallback — the cost is in trying, not just in succeeding.
export function recordAiGeneration(agentId:string):number{
 const all=readAll(),today=localDateKey(),current=all[agentId]?.date===today?all[agentId].count:0,next=current+1;
 all[agentId]={date:today,count:next};
 writeAll(all);
 return Math.max(0,aiGenerationDailyCap-next);
}
