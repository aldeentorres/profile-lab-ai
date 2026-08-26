import {readFileSync} from "node:fs";

const escapeHtml=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

// Every image travels inside the message as an inline part rather than as a hosted <img src> URL: the
// demo runs offline on localhost, which no real inbox can fetch, so a remote image would arrive as a
// broken box. They are read once at start-up because every reminder in a batch sends the same files.
// The example portrait is flattened onto the hero red so it reads as cut out against the panel, and is
// presentation-matched so the agent sees a photo like their own rather than a stranger's. The icons keep
// their alpha instead of baking in the cream, so a client that repaints the section cannot leave them
// sitting on a pale square.
const assetUrl=name=>new URL(`../public/email/${name}`,import.meta.url);
const asset=(cid,name,type)=>({cid,name,type,content:readFileSync(assetUrl(name)).toString("base64")});
const logoImage=asset("profile-lab-logo","profile-lab-logo.png","image/png"),cameraIcon=asset("profile-lab-camera","icon-camera.png","image/png"),libraryIcon=asset("profile-lab-library","icon-library.png","image/png");
const exampleImages={male:asset("profile-lab-example","example-male.jpg","image/jpeg"),female:asset("profile-lab-example","example-female.jpg","image/jpeg")};

export function buildTestReminderEmail(input,actualRecipient){
 const name=String(input.agentName??"").slice(0,160),agentId=String(input.agentId??"").slice(0,120),intended=String(input.intendedRecipientEmail??"").trim()||"Not available",upload=String(input.uploadUrl??""),optOut=String(input.optOutUrl??""),library=String(input.libraryUrl??"")||(upload?`${upload}${upload.includes("?")?"&":"?"}reminder_action=library`:""),gender=input.gender==="female"?"female":"male",example=exampleImages[gender],subject=`[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — ${name}`,footerText=`TEST MODE\nIntended Agent: ${name}\nAgent ID: ${agentId}\nOriginal recipient: ${intended}\nActual test delivery: ${actualRecipient}`,safeName=escapeHtml(name),safeAgentId=escapeHtml(agentId),safeIntended=escapeHtml(intended),safeActual=escapeHtml(actualRecipient),safeUpload=escapeHtml(upload),safeLibrary=escapeHtml(library),safeOptOut=escapeHtml(optOut);
 return{id:String(input.id??""),to:actualRecipient,subject,inlineImages:[logoImage,example,cameraIcon,libraryIcon],text:`Hi ${name},\n\nYOUR BEST PHOTO DESERVES A SPOTLIGHT\n\nThe Prestige Award Night is happening soon and we want you to look your best in our event visuals.\n\nYour current photo received a low quality score. Please update it using one of the following options:\n\n1. Upload a new photo — use Profile Lab AI in Atlas to upload and enhance a higher-quality profile photo.\nUpload My Photo: ${upload}\n\n2. Choose from library — review your photo library and select the image you want us to use for the event.\nOpen Library: ${library}\n\nI don't wish to submit a photo: ${optOut}\n\n---\n${footerText}\n`,html:`<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="x-apple-disable-message-reformatting">
 <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
 <meta name="color-scheme" content="light only">
 <meta name="supported-color-schemes" content="light only">
 <title>${escapeHtml(subject)}</title>
 <style>
  :root{color-scheme:light only;supported-color-schemes:light only}
  html,body{width:100%!important;margin:0!important;padding:0!important;background:#efe6da}table,td{border-collapse:collapse!important;mso-table-lspace:0!important;mso-table-rspace:0!important}a{text-decoration:none}img{border:0;outline:none;-ms-interpolation-mode:bicubic}.preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}
  [data-ogsc] .hero-copy,[data-ogsc] .hero-copy div{color:#fce7cc!important}[data-ogsc] .headline-accent{color:#ffdf62!important}[data-ogsc] .option-section{background-color:#fce7cc!important}[data-ogsc] .option-copy{color:#16191a!important}[data-ogsc] .option-title{color:#ef4136!important}[data-ogsb] .option-section{background-color:#fce7cc!important}
  @media only screen and (max-width:620px){.email-container{width:100%!important}.hero-cell{display:block!important;width:100%!important;max-width:100%!important}.hero-photo{padding:18px 0 0!important;text-align:center!important}.hero-photo img{margin:0 auto!important}.hero-copy{padding:20px 24px 30px!important}.headline{font-size:23px!important;line-height:28px!important}.headline-accent{font-size:44px!important;line-height:46px!important}.option-section{padding:28px 22px!important}.option-title{font-size:18px!important;line-height:21px!important}.option-copy{font-size:15px!important;line-height:23px!important}.button-link{display:block!important;min-width:0!important}}
 </style>
</head>
<body style="margin:0;padding:0;background-color:#efe6da">
 <div class="preheader">Your current photo received a low quality score — update it before The Prestige Award Night.</div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#efe6da">
  <tr><td align="center" style="padding:0">
   <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#fce7cc">
    <tr><td style="padding:14px 20px;background-color:#000000;font-family:Arial,Helvetica,sans-serif">
     <img src="cid:${logoImage.cid}" alt="Profile Lab AI" width="118" style="display:block;width:118px;max-width:118px;height:auto;border:0">
    </td></tr>
    <tr><td style="background-color:#ef4136">
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
      <tr>
       <td class="hero-cell hero-photo" width="228" valign="bottom" style="width:228px;background-color:#ef4136;font-size:0;line-height:0">
        <img src="cid:${example.cid}" alt="An agent whose profile photo passes the studio check" width="228" style="display:block;width:228px;max-width:100%;height:auto;border:0">
       </td>
       <td class="hero-cell hero-copy" valign="middle" align="center" style="padding:30px 26px 34px;background-color:#ef4136;font-family:Arial,Helvetica,sans-serif;color:#fce7cc;text-align:center">
        <div class="headline" style="font-size:27px;line-height:33px;font-weight:400;letter-spacing:1.2px;color:#fce7cc">YOUR BEST PHOTO<br>DESERVES A</div>
        <div class="headline-accent" style="padding-top:2px;font-size:55px;line-height:57px;font-weight:900;letter-spacing:1px;color:#ffdf62">SPOTLIGHT</div>
        <div style="padding-top:16px;font-size:18px;line-height:24px;font-weight:800;color:#fce7cc">The Prestige Award Night</div>
        <div style="padding-top:3px;font-size:13px;line-height:19px;color:#fce7cc">is happening soon<br>and we want you to look your best in our event visuals.</div>
        <div style="padding-top:18px;font-size:13px;line-height:20px;color:#fce7cc">Hi ${safeName}, your current photo received a <strong style="font-weight:800">low quality score</strong>. Please update it using one of the following options:</div>
       </td>
      </tr>
     </table>
    </td></tr>
    <tr><td class="option-section" align="center" style="padding:36px 40px 12px;background-color:#fce7cc;font-family:Arial,Helvetica,sans-serif;color:#16191a;text-align:center">
     <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto"><tr>
      <td width="50" valign="middle" style="width:50px"><div style="width:40px;height:40px;border-radius:20px;background-color:#ef4136;font-size:22px;line-height:40px;font-weight:900;color:#fce7cc;text-align:center">1</div></td>
      <td class="option-title" valign="middle" style="padding-right:12px;font-size:21px;line-height:24px;font-weight:900;letter-spacing:.4px;color:#ef4136;text-align:left">UPLOAD A<br>NEW PHOTO</td>
      <td width="44" valign="middle" style="width:44px"><img src="cid:${cameraIcon.cid}" alt="" width="40" style="display:block;width:40px;height:auto;border:0"></td>
     </tr></table>
     <div class="option-copy" style="padding:18px 0 20px;font-size:16px;line-height:25px;color:#16191a">Use Profile Lab AI in Atlas to upload and enhance a higher-quality profile photo.</div>
     <a class="button-link" href="${safeUpload}" target="_blank" style="display:inline-block;min-width:260px;padding:13px 24px;background-color:#ef4136;border-radius:22px;font-size:15px;line-height:19px;font-weight:900;letter-spacing:.6px;color:#ffffff;text-align:center">UPLOAD MY PHOTO&nbsp;&nbsp;&gt;</a>
    </td></tr>
    <tr><td class="option-section" align="center" style="padding:34px 40px 34px;background-color:#fce7cc;font-family:Arial,Helvetica,sans-serif;color:#16191a;text-align:center">
     <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto"><tr>
      <td width="50" valign="middle" style="width:50px"><div style="width:40px;height:40px;border-radius:20px;background-color:#ef4136;font-size:22px;line-height:40px;font-weight:900;color:#fce7cc;text-align:center">2</div></td>
      <td class="option-title" valign="middle" style="padding-right:12px;font-size:21px;line-height:24px;font-weight:900;letter-spacing:.4px;color:#ef4136;text-align:left">CHOOSE FROM<br>LIBRARY</td>
      <td width="44" valign="middle" style="width:44px"><img src="cid:${libraryIcon.cid}" alt="" width="40" style="display:block;width:40px;height:auto;border:0"></td>
     </tr></table>
     <div class="option-copy" style="padding:18px 0 20px;font-size:16px;line-height:25px;color:#16191a">Review your photo library and select the image you want us to use for the event.</div>
     <a class="button-link" href="${safeLibrary}" target="_blank" style="display:inline-block;min-width:260px;padding:13px 24px;background-color:#ef4136;border-radius:22px;font-size:15px;line-height:19px;font-weight:900;letter-spacing:.6px;color:#ffffff;text-align:center">OPEN LIBRARY&nbsp;&nbsp;&gt;</a>
     <div style="padding-top:22px"><a href="${safeOptOut}" target="_blank" style="font-size:12px;line-height:18px;color:#8a6a45;text-decoration:underline;text-underline-offset:3px">I don’t wish to submit a photo</a></div>
    </td></tr>
    <tr><td style="padding:16px 22px;background-color:#f4dcbe;border-top:1px solid #e5c99f;font-family:Arial,Helvetica,sans-serif;color:#7a5c39;font-size:11px;line-height:17px">
     <strong style="color:#a33125;letter-spacing:.8px">TEST MODE</strong><br>Intended Agent: ${safeName}<br>Agent ID: ${safeAgentId}<br>Original recipient: ${safeIntended}<br>Actual test delivery: ${safeActual}
    </td></tr>
   </table>
  </td></tr>
 </table>
</body>
</html>`}
}
