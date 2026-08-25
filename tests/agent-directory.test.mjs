import assert from "node:assert/strict";
import test from "node:test";
import {extractIqiAgents,matchAgents,normaliseIqiAgent} from "../app/agent-directory.ts";

test("normalises IQI agents and removes missing-avatar placeholders",()=>{
 assert.deepEqual(normaliseIqiAgent({id:71502,display_name:" Niel Kingston ",team_name:"North",ren_tag:"REN01143",avatar_url:"https://cdn/missing.png",branch_name:"KL",designation:"Negotiator"}),{agentId:"71502",name:"Niel Kingston",teamName:"North",ren:"REN01143",avatarUrl:"",branch:"KL",designation:"Negotiator",status:""});
 assert.equal(normaliseIqiAgent({id:"2",full_name:"Aina",ren_tag:"REN"}).ren,"","a bare REN label is not a REN number");
});
test("extracts common API envelopes and matches name, ID and REN",()=>{
 const agents=extractIqiAgents({data:[{id:"1",display_name:"Maya Tan"}]}).map(normaliseIqiAgent);
 assert.equal(agents.length,1);
 assert.equal(matchAgents(agents,"maya").length,1);
 assert.equal(matchAgents(agents,"1").length,1);
 assert.equal(matchAgents(agents,"missing").length,0);
});
