import assert from "node:assert/strict";
import test from "node:test";
import {agentPresentation,extractIqiAgents,isMissingAvatarUrl,matchAgents,normaliseIqiAgent} from "../app/agent-directory.ts";

test("normalises IQI agents and removes missing-avatar placeholders",()=>{
 assert.deepEqual(normaliseIqiAgent({id:71502,display_name:" Niel Kingston ",team_name:"North",ren_tag:"REN01143",avatar_url:"https://cdn/missing.png",branch_name:"KL",designation:"Negotiator"}),{agentId:"71502",name:"Niel Kingston",teamName:"North",ren:"REN01143",avatarUrl:"",gender:"male",branch:"KL",designation:"Negotiator",status:""});
 assert.equal(normaliseIqiAgent({id:"2",full_name:"Aina",ren_tag:"REN"}).ren,"","a bare REN label is not a REN number");
 assert.equal(isMissingAvatarUrl("/avatars/original/missing.png"),true,"Atlas must not paint the IQI missing-avatar asset");
 assert.equal(isMissingAvatarUrl("https://cdn.iqiglobal.com/agents/amir.jpg"),false);
});
test("extracts common API envelopes and matches name, ID and REN",()=>{
 const agents=extractIqiAgents({data:[{id:"1",display_name:"Maya Tan"}]}).map(normaliseIqiAgent);
 assert.equal(agents.length,1);
 assert.equal(matchAgents(agents,"maya").length,1);
 assert.equal(matchAgents(agents,"1").length,1);
 assert.equal(matchAgents(agents,"missing").length,0);
});

test("the reminder example portrait follows the agent's own presentation, not a guess about them",()=>{
 assert.equal(normaliseIqiAgent({id:"9",full_name:"Chan Wei Ling",gender:"Female"}).gender,"female","a stated gender always wins over the name");
 assert.equal(agentPresentation("Siti Nurhaliza"),"female");
 assert.equal(agentPresentation("Nurul Huda binti Ahmad"),"female","binti is a reliable signal where a given name is not");
 assert.equal(agentPresentation("Puan Chan Wei Ling"),"female","an honorific is a reliable signal where a given name is not");
 assert.equal(agentPresentation("Ahmad bin Ismail"),"male");
 assert.equal(agentPresentation("Chan Wei Ling"),"male","an unreadable name falls back rather than guessing");
 assert.equal(agentPresentation("Chan Wei Ling","male"),"male")
});
