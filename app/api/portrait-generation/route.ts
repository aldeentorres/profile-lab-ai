import {portraitPrompt, portraitPromptVersion} from "../../portrait-prompt";

// Server-only proxy for the generative portrait adapter behind "Generate AI Portrait". The browser posts
// only the agent's photo (Image 1) and which bundled reference matches the agent's presentation; this
// route loads that one reference itself, attaches the prompt and the provider key, and returns the PNG.
// No key reaches client JavaScript, and when neither provider is configured the client falls back to the
// on-device pipeline — the demo never depends on this. The client is provider-agnostic: it always POSTs
// here and reads engine/error text back.
//
// Two interchangeable backends, tried in this order:
//   Gemini   GEMINI_API_KEY — gemini-2.5-flash-image (aka "Nano Banana"), Google's free-tier image model.
//            Override with GEMINI_IMAGE_MODEL.
//   OpenAI   OPENAI_API_KEY — gpt-image-1 image edits, `input_fidelity: high` for exactly this job.
//            Override with PORTRAIT_IMAGE_MODEL, host with OPENAI_BASE_URL.
// Both take the same two images in the same role order (identity photo, then the reference) and the same
// prompt text, so switching provider is only ever an env change.
const MAX_IMAGE_BYTES=12*1024*1024,ACCEPTED=["image/jpeg","image/png","image/webp"];
const openaiSizes:Record<string,string>={portrait:"1024x1536",square:"1024x1024"};
// The prompt (./portrait-prompt) speaks of a single Image 2, so exactly one reference goes out — the one
// matching the agent's own presentation, never a mix of both. It never influences identity, only pose,
// wardrobe direction, lighting, background and presentation quality; the choice is the agent's own,
// offered as an explicit pick in the UI rather than inferred from the photo. It is a static asset and is
// fetched here, from this deployment's own origin, rather than uploaded by the browser: the dev server
// rejects request bodies over 1 MiB and a reference alone is over half that.
const referencePaths:Record<"female"|"male",string>={female:"/portrait-references/reference-2.png",male:"/portrait-references/reference-1.png"};
const referenceCache=new Map<string,Promise<Blob>>();
function loadReference(origin:string,gender:"female"|"male"){
 const path=referencePaths[gender];
 let cached=referenceCache.get(path);
 if(!cached){cached=fetch(new URL(path,origin)).then(response=>{if(!response.ok)throw new Error(`Reference ${path} is missing (${response.status})`);return response.blob()}).catch(error=>{referenceCache.delete(path);throw error});referenceCache.set(path,cached)}
 return cached;
}

type Provider={id:"gemini"|"openai";key:string;model:string};
function activeProvider():Provider|null{
 const gemini=process.env.GEMINI_API_KEY?.trim();
 if(gemini)return {id:"gemini",key:gemini,model:process.env.GEMINI_IMAGE_MODEL?.trim()||"gemini-2.5-flash-image"};
 const openai=process.env.OPENAI_API_KEY?.trim();
 if(openai)return {id:"openai",key:openai,model:process.env.PORTRAIT_IMAGE_MODEL?.trim()||"gpt-image-1"};
 return null;
}

export async function GET(){
 const provider=activeProvider();
 if(!provider)return Response.json({available:false,reason:"not_configured"},{headers:{"Cache-Control":"no-store"}});
 return Response.json({available:true,engine:`${provider.model} · identity-locked prompt ${portraitPromptVersion}`},{headers:{"Cache-Control":"no-store"}});
}

async function blobToBase64(blob:Blob){
 return Buffer.from(await blob.arrayBuffer()).toString("base64");
}

async function generateWithGemini(provider:Provider,image:File,reference:Blob):Promise<{png:Uint8Array}|{error:string;status:number}>{
 const parts=await Promise.all([image,reference].map(async blob=>({inline_data:{mime_type:blob.type||"image/png",data:await blobToBase64(blob)}})));
 const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`;
 const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:portraitPrompt},...parts]}]}),signal:AbortSignal.timeout(300000)});
 const payload=await response.json().catch(()=>null) as {error?:{message?:string};candidates?:{finishReason?:string;content?:{parts?:{text?:string;inlineData?:{data?:string};inline_data?:{data?:string}}[]}}[]}|null;
 if(!response.ok)return {error:payload?.error?.message??"The portrait could not be generated.",status:response.status};
 const candidate=payload?.candidates?.[0],imagePart=candidate?.content?.parts?.find(part=>part.inlineData?.data||part.inline_data?.data);
 const encoded=imagePart?.inlineData?.data??imagePart?.inline_data?.data;
 if(!encoded){
  const textPart=candidate?.content?.parts?.find(part=>part.text)?.text;
  const reason=candidate?.finishReason;
  return {error:textPart||`The model returned no image${reason?` (${reason})`:""}.`,status:502};
 }
 return {png:Uint8Array.from(Buffer.from(encoded,"base64"))};
}

async function generateWithOpenAI(provider:Provider,image:File,reference:Blob,format:string):Promise<{png:Uint8Array}|{error:string;status:number}>{
 const endpoint=new URL("v1/images/edits",(process.env.OPENAI_BASE_URL?.trim()||"https://api.openai.com").replace(/\/?$/,"/"));
 const upstream=new FormData();
 upstream.set("model",provider.model);
 upstream.set("prompt",portraitPrompt);
 upstream.set("n","1");
 upstream.set("size",openaiSizes[format]??openaiSizes.portrait);
 upstream.set("quality","high");
 upstream.set("input_fidelity","high");
 upstream.set("output_format","png");
 // Order is the image role: the identity photo first, then the reference the prompt calls Image 2.
 upstream.append("image[]",image,"image-1.png");
 upstream.append("image[]",reference,"image-2.png");
 const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${provider.key}`},body:upstream,signal:AbortSignal.timeout(300000)});
 const payload=await response.json().catch(()=>null) as {data?:{b64_json?:string}[];error?:{message?:string}}|null;
 if(!response.ok)return {error:payload?.error?.message??"The portrait could not be generated.",status:response.status};
 const encoded=payload?.data?.[0]?.b64_json;
 if(!encoded)return {error:"The portrait service returned no image.",status:502};
 return {png:Uint8Array.from(Buffer.from(encoded,"base64"))};
}

export async function POST(request:Request){
 const provider=activeProvider();
 if(!provider)return Response.json({error:"Portrait generation is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY to enable it; the on-device pipeline still works."},{status:503,headers:{"Cache-Control":"no-store"}});
 let form:FormData;
 try{form=await request.formData()}catch{return Response.json({error:"Send the photo as multipart form data."},{status:400})}
 const image=form.get("image"),format=String(form.get("format")??"portrait"),genderInput=String(form.get("gender")??"");
 if(!(image instanceof File))return Response.json({error:"The identity photo (Image 1) is missing."},{status:400});
 if(!ACCEPTED.includes(image.type))return Response.json({error:"Upload a JPG, PNG, or WebP image."},{status:415});
 if(!image.size||image.size>MAX_IMAGE_BYTES)return Response.json({error:"The photo must be between 1 byte and 12 MB."},{status:413});
 if(genderInput!=="female"&&genderInput!=="male")return Response.json({error:"Choose which presentation reference to use before generating."},{status:400});
 const gender=genderInput;
 let reference:Blob;
 try{reference=await loadReference(request.url,gender)}catch(error){return Response.json({error:error instanceof Error?error.message:"The reference portrait could not be loaded."},{status:500,headers:{"Cache-Control":"no-store"}})}
 try{
  const result=provider.id==="gemini"?await generateWithGemini(provider,image,reference):await generateWithOpenAI(provider,image,reference,format);
  if("error" in result)return Response.json({error:result.error},{status:result.status,headers:{"Cache-Control":"no-store"}});
  return new Response(result.png.buffer.slice(result.png.byteOffset,result.png.byteOffset+result.png.byteLength) as ArrayBuffer,{status:200,headers:{"Content-Type":"image/png","Cache-Control":"no-store","X-Portrait-Engine":`${provider.id}:${provider.model}`,"X-Portrait-Prompt-Version":portraitPromptVersion}});
 }catch(error){const timedOut=error instanceof Error&&error.name==="TimeoutError";return Response.json({error:timedOut?"Portrait generation timed out.":"Could not reach the portrait generation service."},{status:timedOut?504:502,headers:{"Cache-Control":"no-store"}})}
}
