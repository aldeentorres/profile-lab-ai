import assert from "node:assert/strict";
import test from "node:test";

import {isPuterCreditError,puterImageModels,puterTxt2ImgOptions,shouldRetryPuterModel} from "../app/puter-portrait.ts";

test("Puter image generation starts on gpt-image-1-mini, the documented cheap img2img default",()=>{
 assert.equal(puterImageModels[0],"gpt-image-1-mini","new accounts cannot pay Gemini Nano Banana from a starter allowance");
 assert.ok(!puterImageModels.some(model=>model.includes("gemini-2.5")),"gemini-2.5-flash-image is billed as a premium model and drains new accounts");
});

test("Puter 402 insufficient_funds is a credit error even when wrapped in Error",()=>{
 assert.equal(isPuterCreditError({code:"insufficient_funds",status:402}),true);
 assert.equal(isPuterCreditError(new Error("Available funding is insufficient for this request.")),true);
 assert.equal(isPuterCreditError({error:{code:"error_402_payment_required"}}),true);
 assert.equal(isPuterCreditError(new Error("model not found")),false);
});

test("a credit error must not retry a second model (Puter reserves max cost while in flight)",()=>{
 assert.equal(shouldRetryPuterModel(new Error("model_not_found")),true,"a missing model id can fall through to the alias");
 assert.equal(shouldRetryPuterModel({code:"insufficient_funds"}),false,"retrying after 402 reserves a second generation against an empty allowance");
});

test("txt2img options send a data URI and cap quality so new-account credit is enough",()=>{
 const dataUrl="data:image/jpeg;base64,abc";
 const openai=puterTxt2ImgOptions(dataUrl,"gpt-image-1-mini");
 assert.equal(openai.input_image,dataUrl,"docs accept a data URI; splitting mime and payload drops it");
 assert.equal(openai.quality,"low","OpenAI default is low; omitting it still bills more when a provider upgrades the default");
 const gemini=puterTxt2ImgOptions(dataUrl,"google/gemini-3.1-flash-image-preview");
 assert.equal(gemini.quality,"1K","Gemini 2K/4K is the bill that empties a new account");
});
