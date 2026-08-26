import assert from "node:assert/strict";
import {Duplex} from "node:stream";
import test from "node:test";
import {sendSmtpMessages} from "../scripts/smtp-client.mjs";
import {buildTestReminderEmail} from "../scripts/reminder-email.mjs";

test("the local SMTP adapter sends every personalised reminder to one test inbox",async()=>{
 const recipients=[],subjects=[],bodies=[];let data="",inData=false;
 class TestSmtpSocket extends Duplex{_read(){} _write(chunk,encoding,done){for(const line of chunk.toString("utf8").split("\r\n")){if(inData){if(line==="."){inData=false;const subject=/^Subject: (.+)$/m.exec(data)?.[1];if(subject)subjects.push(subject);bodies.push(data);data="";this.push("250 accepted\r\n")}else data+=`${line}\r\n`;continue}if(/^EHLO /.test(line))this.push("250-test.smtp.local\r\n250 PIPELINING\r\n");else if(/^MAIL FROM:/.test(line))this.push("250 sender ok\r\n");else if(/^RCPT TO:/.test(line)){recipients.push(line);this.push("250 recipient ok\r\n")}else if(line==="DATA"){inData=true;this.push("354 send data\r\n")}else if(line==="QUIT")this.push("221 bye\r\n")}done()}}
 const socketFactory=()=>{const socket=new TestSmtpSocket();queueMicrotask(()=>{socket.emit("connect");socket.push("220 test.smtp.local ready\r\n")});return socket},to="test-one@example.test",messages=[{id:"one",to,subject:"Reminder one",text:"Hello First",html:"<p>Hello First</p>",inlineImages:[{cid:"profile-lab-logo",name:"profile-lab-logo.png",type:"image/png",content:Buffer.from("logo").toString("base64")}]},{id:"two",to,subject:"Reminder two",text:"Hello Second",html:"<p>Hello Second</p>"}];
 assert.deepEqual(await sendSmtpMessages({host:"127.0.0.1",port:2525,security:"none",auth:"none",from:"Studio+ <studio@example.test>",socketFactory},messages),["one","two"]);assert.deepEqual(recipients,[`RCPT TO:<${to}>`,`RCPT TO:<${to}>`]);assert.deepEqual(subjects,["Reminder one","Reminder two"]);
 assert.match(bodies[0],/Content-Type: multipart\/related; type="multipart\/alternative"/,"an inline image must travel with the message so it renders with no network");
 assert.match(bodies[0],/Content-ID: <profile-lab-logo>/);assert.match(bodies[0],/Content-Disposition: inline; filename="profile-lab-logo.png"/);
 assert.match(bodies[1],/Content-Type: multipart\/alternative/,"a message with no inline image keeps the plain alternative envelope");
 assert.doesNotMatch(bodies[1],/multipart\/related/)
});
test("test reminder content is separate, personalised and auditable",()=>{
 const actual="test-one@example.test",first=buildTestReminderEmail({id:"one",agentId:"A-1",agentName:"Joyce Yeoh",gender:"female",intendedRecipientEmail:"joyce@example.test",uploadUrl:"http://localhost:3000/?reminder=one",libraryUrl:"http://localhost:3000/?reminder=one&reminder_action=library",optOutUrl:"http://localhost:3000/?reminder=one&reminder_action=optout"},actual),second=buildTestReminderEmail({id:"two",agentId:"A-2",agentName:"Daniel Tan",uploadUrl:"http://localhost:3000/?reminder=two",optOutUrl:"http://localhost:3000/?reminder=two&reminder_action=optout"},actual);
 assert.equal(first.to,actual);assert.equal(second.to,actual);assert.match(first.subject,/^\[TEST\].*Joyce Yeoh$/);assert.match(second.subject,/^\[TEST\].*Daniel Tan$/);assert.match(first.html,/Intended Agent: Joyce Yeoh/);assert.match(first.html,/Agent ID: A-1/);assert.match(first.html,/Original recipient: joyce@example\.test/);assert.match(first.html,/Actual test delivery: test-one@example\.test/);assert.match(first.html,/reminder=one/);assert.match(second.html,/reminder=two/);assert.doesNotMatch(first.html,/reminder=two/);assert.deepEqual(first.inlineImages.map(image=>image.name),["profile-lab-logo.png","example-female.jpg","icon-camera.png","icon-library.png"],"a female agent must see the female example portrait");
 assert.deepEqual(second.inlineImages.map(image=>image.name),["profile-lab-logo.png","example-male.jpg","icon-camera.png","icon-library.png"],"an unstated presentation falls back to the male example");
 assert.match(first.html,/src="cid:profile-lab-logo"/,"the logo must be inline, never a hosted URL the offline demo cannot serve");
 assert.match(first.html,/src="cid:profile-lab-example"/);assert.doesNotMatch(first.html,/<img[^>]+src="https?:/);
 assert.ok(first.inlineImages.every(image=>image.content.length>500),"an inline image must carry its own bytes");
 assert.match(first.html,/role="presentation"/);assert.match(first.html,/background-color:#000000/);assert.match(first.html,/background-color:#ef4136/);assert.match(first.html,/background-color:#fce7cc/);assert.match(first.html,/SPOTLIGHT/);assert.match(first.html,/UPLOAD A<br>NEW PHOTO/);assert.match(first.html,/CHOOSE FROM<br>LIBRARY/);
 assert.match(first.html,/href="http:\/\/localhost:3000\/\?reminder=one&amp;reminder_action=library"/,"the library option must open the agent's own photo library, not the upload console");
 assert.match(first.html,/reminder_action=optout/,"an agent must still be able to opt out from the email");
 assert.match(first.html,/<meta name="color-scheme" content="light only">/,"a dark-mode inbox must not repaint the cream panel and darken the copy");
 assert.match(first.html,/<meta name="supported-color-schemes" content="light only">/);assert.match(first.html,/color-scheme:light only/);
 assert.doesNotMatch(first.html,/photo-score-low-man/)
});
