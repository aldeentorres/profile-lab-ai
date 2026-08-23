type RatingMetric={name:string;score:number;note:string};
type PhotoRequirement={id:string;label:string;status:"PASS"|"FAIL";score:number;confidence:number;severity:"none"|"warning"|"critical";detail:string};
type PhotoPenalty={id:string;label:string;points:number;cap:number|null;forces_status:"REVIEW"|"REJECT"|null};
type PhotoPreflight={score:number;overall_score:number;base_score:number;status:"APPROVED"|"REVIEW"|"REJECT";label:string;confidence:number;technical_quality:number;professionalism:number;composition:number;background_quality:number;face_quality:number;designer_usability:number;pose_appropriateness:number;selfie_probability:number;issues:string[];strengths:string[];recommendation:string;decision_reason:string;requirements:PhotoRequirement[];penalties:PhotoPenalty[];metrics:RatingMetric[]};
type StudioSession={session:string;agentId:string;agentName:string;agentPhoto?:string;agentMobile?:string;agentRenTag?:string;agentOfficePhone?:string;rating?:number;ratingLabel?:string;ratingMetrics?:RatingMetric[];photoPreflight?:PhotoPreflight;date:string;time:string;createdAt:string;status:"confirmed"};

const globalSessions=globalThis as typeof globalThis&{__photoStudioSessions?:Map<string,StudioSession>};
const sessions=globalSessions.__photoStudioSessions??=new Map<string,StudioSession>();

export async function POST(request:Request){
 try{
  const body=await request.json() as Partial<StudioSession>;
  if(!body.session||!body.agentId||!body.agentName||!body.date||!body.time)return Response.json({error:"Missing appointment details"},{status:400});
  const record:StudioSession={session:body.session,agentId:body.agentId,agentName:body.agentName,agentPhoto:body.agentPhoto,agentMobile:body.agentMobile,agentRenTag:body.agentRenTag,agentOfficePhone:body.agentOfficePhone,rating:body.rating,ratingLabel:body.ratingLabel,ratingMetrics:body.ratingMetrics,photoPreflight:body.photoPreflight,date:body.date,time:body.time,createdAt:new Date().toISOString(),status:"confirmed"};
  sessions.set(record.session,record);
  return Response.json(record,{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Invalid appointment"},{status:400})}
}

export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get("session")||"",record=sessions.get(code);
 if(!record)return Response.json({error:"Appointment not found"},{status:404,headers:{"Cache-Control":"no-store"}});
 return Response.json(record,{headers:{"Cache-Control":"no-store"}});
}
