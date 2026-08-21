type RatingMetric={name:string;score:number;note:string};
type StudioSession={session:string;agentId:string;agentName:string;agentPhoto?:string;rating?:number;ratingLabel?:string;ratingMetrics?:RatingMetric[];date:string;time:string;createdAt:string;status:"confirmed"};

const globalSessions=globalThis as typeof globalThis&{__photoStudioSessions?:Map<string,StudioSession>};
const sessions=globalSessions.__photoStudioSessions??=new Map<string,StudioSession>();

export async function POST(request:Request){
 try{
  const body=await request.json() as Partial<StudioSession>;
  if(!body.session||!body.agentId||!body.agentName||!body.date||!body.time)return Response.json({error:"Missing appointment details"},{status:400});
  const record:StudioSession={session:body.session,agentId:body.agentId,agentName:body.agentName,agentPhoto:body.agentPhoto,rating:body.rating,ratingLabel:body.ratingLabel,ratingMetrics:body.ratingMetrics,date:body.date,time:body.time,createdAt:new Date().toISOString(),status:"confirmed"};
  sessions.set(record.session,record);
  return Response.json(record,{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Invalid appointment"},{status:400})}
}

export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get("session")||"",record=sessions.get(code);
 if(!record)return Response.json({error:"Appointment not found"},{status:404,headers:{"Cache-Control":"no-store"}});
 return Response.json(record,{headers:{"Cache-Control":"no-store"}});
}
