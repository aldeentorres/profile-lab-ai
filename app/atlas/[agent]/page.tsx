import AtlasProfile from "../profile";

export default async function AgentAtlasPage({params}:{params:Promise<{agent:string}>}){
 const {agent}=await params;
 return <AtlasProfile agentSlug={agent}/>;
}
