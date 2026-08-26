import net from "node:net";
import tls from "node:tls";

const timeoutMs=10000;

class Replies{
 constructor(socket){this.socket=socket;this.buffer="";this.current=[];this.queue=[];this.waiters=[];this.onData=data=>this.consume(data.toString("utf8"));this.onError=error=>this.fail(error);socket.on("data",this.onData);socket.on("error",this.onError)}
 consume(chunk){this.buffer+=chunk;for(;;){const end=this.buffer.indexOf("\n");if(end<0)return;const line=this.buffer.slice(0,end+1).replace(/\r?\n$/,"");this.buffer=this.buffer.slice(end+1);this.current.push(line);const match=/^(\d{3})([ -])/.exec(line);if(match?.[2]===" "){const reply={code:Number(match[1]),text:this.current.join("\n")};this.current=[];const waiter=this.waiters.shift();if(waiter)waiter.resolve(reply);else this.queue.push(reply)}}}
 fail(error){for(const waiter of this.waiters.splice(0))waiter.reject(error)}
 read(){const reply=this.queue.shift();return reply?Promise.resolve(reply):new Promise((resolve,reject)=>this.waiters.push({resolve,reject}))}
 close(){this.socket.off("data",this.onData);this.socket.off("error",this.onError)}
}

function waitFor(socket,event){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();socket.destroy();reject(new Error("SMTP connection timed out"))},timeoutMs),cleanup=()=>{clearTimeout(timer);socket.off(event,ready);socket.off("error",failed)},ready=()=>{cleanup();resolve()},failed=error=>{cleanup();reject(error)};socket.once(event,ready);socket.once("error",failed)})}
async function expect(replies,codes){const reply=await replies.read();if(!codes.includes(reply.code))throw new Error(`SMTP server returned ${reply.code}: ${reply.text.replaceAll("\n"," ")}`);return reply}
async function command(socket,replies,value,codes){socket.write(`${value}\r\n`);return expect(replies,codes)}
function safeHeader(value){return String(value).replace(/[\r\n]+/g," ").trim()}
function address(value){const clean=safeHeader(value),bracket=/<([^<>\s]+@[^<>\s]+)>/.exec(clean);return bracket?.[1]??clean}
function headerWord(value){const clean=safeHeader(value);return /^[\x20-\x7e]*$/.test(clean)?clean:`=?UTF-8?B?${Buffer.from(clean).toString("base64")}?=`}
function base64Lines(value){return Buffer.from(value,"utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n")??""}
// Inline images ride in a multipart/related wrapper around the usual alternative pair: the demo runs
// offline, so a hosted <img src> would arrive broken and cid: references are the only way the logo and
// the example portrait render in a real inbox.
function inlinePart({cid,name,type,content}){return[`Content-Type: ${type}; name="${safeHeader(name)}"`,"Content-Transfer-Encoding: base64",`Content-ID: <${safeHeader(cid)}>`,`Content-Disposition: inline; filename="${safeHeader(name)}"`,"",String(content).replace(/\s+/g,"").match(/.{1,76}/g)?.join("\r\n")??""].join("\r\n")}
function mimeMessage({from,to,subject,text,html,inlineImages=[]}){const unique=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,alternative=`studio-plus-alt-${unique}`,related=`studio-plus-rel-${unique}`,domain=address(from).split("@")[1]||"localhost";
 const body=[`--${alternative}`,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: base64","",base64Lines(text),`--${alternative}`,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: base64","",base64Lines(html),`--${alternative}--`,""];
 const headers=[`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@${domain}>`,`From: ${safeHeader(from)}`,`To: ${safeHeader(to)}`,`Subject: ${headerWord(subject)}`,"MIME-Version: 1.0"];
 if(!inlineImages.length)return[...headers,`Content-Type: multipart/alternative; boundary="${alternative}"`,"",...body].join("\r\n");
 return[...headers,`Content-Type: multipart/related; type="multipart/alternative"; boundary="${related}"`,"",`--${related}`,`Content-Type: multipart/alternative; boundary="${alternative}"`,"",...body,...inlineImages.flatMap(image=>[`--${related}`,inlinePart(image),""]),`--${related}--`,""].join("\r\n")}
function normaliseConfig(input){const host=String(input.host??"").trim(),port=Number(input.port),security=String(input.security??"starttls").toLowerCase(),auth=String(input.auth??"login").toLowerCase(),from=String(input.from??"").trim();if(!host||!Number.isInteger(port)||port<1||port>65535||!from)throw new Error("SMTP_HOST, SMTP_PORT and SMTP_FROM are required");if(!["implicit","starttls","none"].includes(security))throw new Error("SMTP_SECURITY must be implicit, starttls or none");if(!["login","none"].includes(auth))throw new Error("SMTP_AUTH must be login or none");if(auth==="login"&&(!input.user||!input.pass))throw new Error("SMTP_USER and SMTP_PASS are required for login authentication");if(security==="none"&&!['localhost','127.0.0.1','::1'].includes(host))throw new Error("Unencrypted SMTP is allowed only on localhost");return{host,port,security,auth,user:String(input.user??""),pass:String(input.pass??""),from,socketFactory:input.socketFactory}}
async function connect(config){
 if(config.security==="implicit"){const socket=tls.connect({host:config.host,port:config.port,servername:config.host,rejectUnauthorized:true});await waitFor(socket,"secureConnect");return{socket,replies:new Replies(socket)}}
 const plain=typeof config.socketFactory==="function"?config.socketFactory():net.connect({host:config.host,port:config.port});await waitFor(plain,"connect");let replies=new Replies(plain);await expect(replies,[220]);await command(plain,replies,"EHLO studio-plus.local",[250]);if(config.security==="none")return{socket:plain,replies,greeted:true};await command(plain,replies,"STARTTLS",[220]);replies.close();const socket=tls.connect({socket:plain,servername:config.host,rejectUnauthorized:true});await waitFor(socket,"secureConnect");replies=new Replies(socket);return{socket,replies}
}

export async function sendSmtpMessages(input,messages){
 const config=normaliseConfig(input);if(!Array.isArray(messages)||!messages.length)throw new Error("At least one SMTP message is required");const connection=await connect(config),{socket,replies}=connection,deliveredIds=[];
 try{
  if(config.security==="implicit")await expect(replies,[220]);
  if(!connection.greeted)await command(socket,replies,"EHLO studio-plus.local",[250]);
  if(config.auth==="login"){await command(socket,replies,"AUTH LOGIN",[334]);await command(socket,replies,Buffer.from(config.user).toString("base64"),[334]);await command(socket,replies,Buffer.from(config.pass).toString("base64"),[235])}
  for(const message of messages){const to=address(message.to);await command(socket,replies,`MAIL FROM:<${address(config.from)}>`,[250]);await command(socket,replies,`RCPT TO:<${to}>`,[250,251]);await command(socket,replies,"DATA",[354]);const mime=mimeMessage({from:config.from,to,subject:message.subject,text:message.text,html:message.html,inlineImages:message.inlineImages}),stuffed=mime.split("\r\n").map(line=>line.startsWith(".")?`.${line}`:line).join("\r\n");socket.write(`${stuffed}\r\n.\r\n`);await expect(replies,[250]);deliveredIds.push(message.id)}
  await command(socket,replies,"QUIT",[221]).catch(()=>{});return deliveredIds;
 }finally{replies.close();socket.destroy()}
}

export function smtpConfigFromEnv(environment=process.env){return{host:environment.SMTP_HOST,port:environment.SMTP_PORT??587,security:environment.SMTP_SECURITY??"starttls",auth:environment.SMTP_AUTH??"login",user:environment.SMTP_USER,pass:environment.SMTP_PASS,from:environment.SMTP_FROM}}
