const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const smtpDeliveryTimeoutMs=60000;
export function emailTestConfig(environment:Record<string,string|undefined>=process.env){const testMode=environment.EMAIL_TEST_MODE?.trim().toLowerCase()==="true",override=environment.TEST_EMAIL_OVERRIDE?.trim()??"",legacyRecipient=environment.TEST_EMAIL_RECIPIENT?.trim()??"",recipient=testMode?override:legacyRecipient,configured=emailPattern.test(recipient);return{configured,recipient:configured?recipient:null,smtpEnabled:testMode&&configured,testMode}}
export async function GET(){return Response.json(emailTestConfig(),{headers:{"Cache-Control":"no-store"}})}

export async function POST(request:Request){
 const config=emailTestConfig();
 if(!config.smtpEnabled||!config.recipient)return Response.json({error:"Email test mode and its recipient override are not configured."},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const body=await request.json() as {reminders?:{reminderId?:string;agentId?:string;agentName?:string;gender?:string;intendedRecipientEmail?:string;uploadUrl?:string;libraryUrl?:string;optOutUrl?:string}[]},reminders=body.reminders;
  if(!Array.isArray(reminders)||!reminders.length||reminders.length>50)return Response.json({error:"Send between 1 and 50 test reminders."},{status:400,headers:{"Cache-Control":"no-store"}});
  const origin=(process.env.STUDIO_PUBLIC_URL?.trim()||new URL(request.url).origin).replace(/\/$/,""),messages=reminders.map(item=>{const agentName=String(item.agentName??"").slice(0,160);return{id:String(item.reminderId??""),agentId:String(item.agentId??"").slice(0,120),agentName,gender:item.gender==="female"?"female":"male",intendedRecipientEmail:String(item.intendedRecipientEmail??"").slice(0,254),actualRecipientEmail:config.recipient,subject:`[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — ${agentName}`,uploadUrl:new URL(String(item.uploadUrl??"/"),`${origin}/`).href,libraryUrl:new URL(String(item.libraryUrl??"/"),`${origin}/`).href,optOutUrl:new URL(String(item.optOutUrl??"/"),`${origin}/`).href}});
  if(messages.some(item=>!item.id||!item.agentId||!item.agentName))return Response.json({error:"Each reminder needs an ID, agent ID and agent name."},{status:400,headers:{"Cache-Control":"no-store"}});
  const bridgeUrl=new URL("send",process.env.SMTP_BRIDGE_URL?.trim()||"http://127.0.0.1:3001/");
  const response=await fetch(bridgeUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages}),signal:AbortSignal.timeout(smtpDeliveryTimeoutMs)}),result=await response.json().catch(()=>null) as {deliveredIds?:string[];error?:string}|null;
  if(!response.ok)return Response.json({error:result?.error||"The local SMTP bridge could not deliver the reminders."},{status:502,headers:{"Cache-Control":"no-store"}});
  return Response.json({deliveredIds:result?.deliveredIds??[],actualRecipientEmail:config.recipient,testMode:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){const timeout=error instanceof Error&&error.name==="TimeoutError";return Response.json({error:timeout?"SMTP delivery timed out.":"The local SMTP bridge is not running."},{status:502,headers:{"Cache-Control":"no-store"}})}
}
