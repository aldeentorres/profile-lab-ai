import assert from "node:assert/strict";
import test from "node:test";
import {GET,POST,emailTestConfig,smtpDeliveryTimeoutMs} from "../app/api/designer-test-email/route.ts";

test("email test mode requires one central override and never falls through to an agent",async()=>{
 assert.equal(smtpDeliveryTimeoutMs,60000,"a multi-message SMTP batch must have time to finish after a cold connection");
 assert.deepEqual(emailTestConfig({EMAIL_TEST_MODE:"true",TEST_EMAIL_OVERRIDE:"test-one@example.test",TEST_EMAIL_RECIPIENT:"legacy@example.test"}),{configured:true,recipient:"test-one@example.test",smtpEnabled:true,testMode:true});
 assert.deepEqual(emailTestConfig({EMAIL_TEST_MODE:"true",TEST_EMAIL_OVERRIDE:"",TEST_EMAIL_RECIPIENT:"legacy@example.test"}),{configured:false,recipient:null,smtpEnabled:false,testMode:true},"test mode must fail closed instead of using another recipient");
 const previous={mode:process.env.EMAIL_TEST_MODE,override:process.env.TEST_EMAIL_OVERRIDE};
 try{process.env.EMAIL_TEST_MODE="false";delete process.env.TEST_EMAIL_OVERRIDE;const status=await GET(),body=await status.json();assert.equal(status.headers.get("cache-control"),"no-store");assert.equal(body.smtpEnabled,false);const attempt=await POST(new Request("http://localhost/api/designer-test-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reminders:[{reminderId:"one",agentId:"agent-1",agentName:"Agent"}]})}));assert.equal(attempt.status,503,"the app must never transmit email unless EMAIL_TEST_MODE is explicit")}
 finally{if(previous.mode===undefined)delete process.env.EMAIL_TEST_MODE;else process.env.EMAIL_TEST_MODE=previous.mode;if(previous.override===undefined)delete process.env.TEST_EMAIL_OVERRIDE;else process.env.TEST_EMAIL_OVERRIDE=previous.override}
});
