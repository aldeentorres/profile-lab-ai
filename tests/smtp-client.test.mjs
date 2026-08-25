import assert from "node:assert/strict";
import {Duplex} from "node:stream";
import test from "node:test";
import {sendSmtpMessages} from "../scripts/smtp-client.mjs";
import {buildTestReminderEmail} from "../scripts/reminder-email.mjs";

test("the local SMTP adapter sends every personalised reminder to one test inbox",async()=>{
 const recipients=[],subjects=[];let data="",inData=false;
 class TestSmtpSocket extends Duplex{_read(){} _write(chunk,encoding,done){for(const line of chunk.toString("utf8").split("\r\n")){if(inData){if(line==="."){inData=false;const subject=/^Subject: (.+)$/m.exec(data)?.[1];if(subject)subjects.push(subject);data="";this.push("250 accepted\r\n")}else data+=`${line}\r\n`;continue}if(/^EHLO /.test(line))this.push("250-test.smtp.local\r\n250 PIPELINING\r\n");else if(/^MAIL FROM:/.test(line))this.push("250 sender ok\r\n");else if(/^RCPT TO:/.test(line)){recipients.push(line);this.push("250 recipient ok\r\n")}else if(line==="DATA"){inData=true;this.push("354 send data\r\n")}else if(line==="QUIT")this.push("221 bye\r\n")}done()}}
 const socketFactory=()=>{const socket=new TestSmtpSocket();queueMicrotask(()=>{socket.emit("connect");socket.push("220 test.smtp.local ready\r\n")});return socket},to="test-one@example.test",messages=[{id:"one",to,subject:"Reminder one",text:"Hello First",html:"<p>Hello First</p>"},{id:"two",to,subject:"Reminder two",text:"Hello Second",html:"<p>Hello Second</p>"}];
 assert.deepEqual(await sendSmtpMessages({host:"127.0.0.1",port:2525,security:"none",auth:"none",from:"Studio+ <studio@example.test>",socketFactory},messages),["one","two"]);assert.deepEqual(recipients,[`RCPT TO:<${to}>`,`RCPT TO:<${to}>`]);assert.deepEqual(subjects,["Reminder one","Reminder two"])
});
test("test reminder content is separate, personalised and auditable",()=>{
 const actual="test-one@example.test",first=buildTestReminderEmail({id:"one",agentId:"A-1",agentName:"Joyce Yeoh",intendedRecipientEmail:"joyce@example.test",uploadUrl:"http://localhost:3000/?reminder=one",optOutUrl:"http://localhost:3000/?reminder=one&reminder_action=optout"},actual),second=buildTestReminderEmail({id:"two",agentId:"A-2",agentName:"Daniel Tan",uploadUrl:"http://localhost:3000/?reminder=two",optOutUrl:"http://localhost:3000/?reminder=two&reminder_action=optout"},actual);
 assert.equal(first.to,actual);assert.equal(second.to,actual);assert.match(first.subject,/^\[TEST\].*Joyce Yeoh$/);assert.match(second.subject,/^\[TEST\].*Daniel Tan$/);assert.match(first.html,/Intended Agent: Joyce Yeoh/);assert.match(first.html,/Agent ID: A-1/);assert.match(first.html,/Original recipient: joyce@example\.test/);assert.match(first.html,/Actual test delivery: test-one@example\.test/);assert.match(first.html,/reminder=one/);assert.match(second.html,/reminder=two/);assert.doesNotMatch(first.html,/reminder=two/);assert.match(first.html,/role="presentation"/);assert.match(first.html,/background-color:#111814/);assert.match(first.html,/background-color:#294c3f/);assert.match(first.html,/background-color:#e6643f/);assert.match(first.html,/STILL DUE/);assert.match(first.html,/UPLOAD YOUR<br>PROFILE PHOTO/);assert.doesNotMatch(first.html,/photo-score-low-man/)
});
