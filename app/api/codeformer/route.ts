const MAX_IMAGE_BYTES=12*1024*1024;

function serviceHeaders():Record<string,string>{const token=process.env.CODEFORMER_SERVICE_TOKEN;return token?{Authorization:`Bearer ${token}`}:{}}

export async function GET(){
 const serviceUrl=process.env.CODEFORMER_SERVICE_URL?.trim();
 if(!serviceUrl)return Response.json({available:false,reason:"not_configured"},{headers:{"Cache-Control":"no-store"}});
 try{
  const healthUrl=new URL("health",serviceUrl.endsWith("/")?serviceUrl:`${serviceUrl}/`);
  const response=await fetch(healthUrl,{headers:serviceHeaders(),signal:AbortSignal.timeout(5000)});
  if(!response.ok)return Response.json({available:false,reason:"service_unavailable"},{headers:{"Cache-Control":"no-store"}});
  const health=await response.json() as {ready?:boolean;engine?:string};
  return Response.json({available:health.ready===true,engine:health.engine??"CodeFormer + Real-ESRGAN"},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({available:false,reason:"service_unavailable"},{headers:{"Cache-Control":"no-store"}})}
}

export async function POST(request:Request){
 const serviceUrl=process.env.CODEFORMER_SERVICE_URL?.trim();
 if(!serviceUrl)return Response.json({error:"CodeFormer service is not configured. Start the restoration service and set CODEFORMER_SERVICE_URL."},{status:503,headers:{"Cache-Control":"no-store"}});
 const contentType=request.headers.get("content-type")?.split(";",1)[0].toLowerCase()??"";
 if(!["image/jpeg","image/png","image/webp"].includes(contentType))return Response.json({error:"Upload a JPG, PNG, or WebP image."},{status:415});
 const declaredSize=Number(request.headers.get("content-length")??0);
 if(declaredSize>MAX_IMAGE_BYTES)return Response.json({error:"Image must be 12 MB or smaller."},{status:413});
 const image=await request.arrayBuffer();
 if(!image.byteLength||image.byteLength>MAX_IMAGE_BYTES)return Response.json({error:"Image must be between 1 byte and 12 MB."},{status:413});
 const inputUrl=new URL(request.url),fidelity=Math.min(1,Math.max(0,Number(inputUrl.searchParams.get("fidelity")??.8)||.8)),upscale=inputUrl.searchParams.get("upscale")==="4"?4:2;
 try{
  const restoreUrl=new URL("restore",serviceUrl.endsWith("/")?serviceUrl:`${serviceUrl}/`);
  restoreUrl.searchParams.set("fidelity",fidelity.toFixed(2));
  restoreUrl.searchParams.set("upscale",String(upscale));
  const response=await fetch(restoreUrl,{method:"POST",headers:{...serviceHeaders(),"Content-Type":contentType},body:image,signal:AbortSignal.timeout(300000)});
  if(!response.ok){const detail=await response.json().catch(()=>null) as {detail?:string}|null;return Response.json({error:detail?.detail??"CodeFormer could not restore this photo."},{status:response.status,headers:{"Cache-Control":"no-store"}})}
  return new Response(response.body,{status:200,headers:{"Content-Type":"image/png","Cache-Control":"no-store","X-CodeFormer-Faces":response.headers.get("x-codeformer-faces")??"0","X-Restoration-Engine":"CodeFormer + Real-ESRGAN"}});
 }catch(error){const timedOut=error instanceof Error&&error.name==="TimeoutError";return Response.json({error:timedOut?"CodeFormer restoration timed out.":"Could not reach the CodeFormer service."},{status:timedOut?504:502,headers:{"Cache-Control":"no-store"}})}
}
