export async function GET(request:Request){
 try{
  const slug=new URL(request.url).searchParams.get("slug")||"aaron-paul";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return Response.json({error:"Invalid agent slug"},{status:400});
  const response=await fetch(`https://api.iqiglobal.com/api/web/agents/${slug}`,{headers:{Accept:"application/json"},next:{revalidate:300}});
  if(!response.ok)return Response.json({error:"Atlas agent unavailable"},{status:response.status});
  return Response.json(await response.json(),{headers:{"Cache-Control":"public, max-age=60, stale-while-revalidate=300"}});
 }catch{
  return Response.json({error:"Could not connect to Atlas"},{status:502});
 }
}
