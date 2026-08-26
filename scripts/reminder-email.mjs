const escapeHtml=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

export function buildTestReminderEmail(input,actualRecipient){
 const name=String(input.agentName??"").slice(0,160),agentId=String(input.agentId??"").slice(0,120),intended=String(input.intendedRecipientEmail??"").trim()||"Not available",upload=String(input.uploadUrl??""),optOut=String(input.optOutUrl??""),subject=`[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — ${name}`,footerText=`TEST MODE\nIntended Agent: ${name}\nAgent ID: ${agentId}\nOriginal recipient: ${intended}\nActual test delivery: ${actualRecipient}`,safeName=escapeHtml(name),safeAgentId=escapeHtml(agentId),safeIntended=escapeHtml(intended),safeActual=escapeHtml(actualRecipient),safeUpload=escapeHtml(upload),safeOptOut=escapeHtml(optOut);
 return{id:String(input.id??""),to:actualRecipient,subject,text:`Hi ${name},\n\nYour Profile Lab AI profile photo is still awaiting submission.\n\nPlease upload your photo so our design team can prepare your approved marketing image.\n\nUpload my photo: ${upload}\n\nI don't wish to submit a photo: ${optOut}\n\n---\n${footerText}\n`,html:`<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="x-apple-disable-message-reformatting">
 <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
 <title>${escapeHtml(subject)}</title>
 <style>
  html,body{width:100%!important;margin:0!important;padding:0!important;background:#edf1ef}table,td{border-collapse:collapse!important;mso-table-lspace:0!important;mso-table-rspace:0!important}a{text-decoration:none}.preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}
  @media only screen and (max-width:560px){.email-container{width:100%!important}.email-pad{padding-left:20px!important;padding-right:20px!important}.headline{font-size:26px!important;line-height:30px!important}.body-copy{font-size:15px!important;line-height:22px!important}.button-link{display:block!important;width:auto!important;min-width:0!important}}
 </style>
</head>
<body style="margin:0;padding:0;background-color:#edf1ef">
 <div class="preheader">Your Profile Lab AI profile photo is still awaiting submission.</div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#edf1ef">
  <tr><td align="center" style="padding:28px 16px">
   <table role="presentation" class="email-container" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff">
    <tr><td class="email-pad" style="padding:18px 24px;background-color:#111814;font-family:Arial,Helvetica,sans-serif;color:#f8faf9">
     <div style="font-size:18px;line-height:22px;font-weight:800;letter-spacing:-0.4px">Profile Lab AI</div>
     <div style="padding-top:3px;font-size:10px;line-height:12px;font-weight:700;letter-spacing:1.8px;color:#8fa099">PROFILE STUDIO</div>
    </td></tr>
    <tr><td class="email-pad" align="center" style="padding:32px 28px 28px;background-color:#294c3f;font-family:Arial,Helvetica,sans-serif;color:#f8faf9;text-align:center">
     <div style="font-size:13px;line-height:18px;font-weight:650;letter-spacing:.4px;color:#dce7e1">Your profile photo is</div>
     <div class="headline" style="padding-top:4px;font-size:30px;line-height:34px;font-weight:800;letter-spacing:-0.4px;color:#ef6843">still needed</div>
     <div style="padding-top:12px;font-size:15px;line-height:22px;font-weight:500;color:#dce7e1">One upload is all it takes to get your marketing portrait ready.</div>
    </td></tr>
    <tr><td class="email-pad" style="padding:28px 28px 32px;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#26332d">
     <div class="body-copy" style="font-size:15px;line-height:23px;color:#405048"><strong style="color:#26332d">Hi ${safeName},</strong><br><br>Your Profile Lab AI profile photo is still awaiting submission. Please upload a clear portrait so our design team can prepare your approved marketing image.</div>
     <div style="padding-top:22px;text-align:center"><a class="button-link" href="${safeUpload}" target="_blank" style="display:inline-block;min-width:220px;padding:14px 22px;background-color:#e6643f;border-radius:10px;font-size:15px;line-height:20px;font-weight:750;color:#ffffff;text-align:center">Upload my photo</a></div>
     <div style="padding-top:16px;text-align:center"><a href="${safeOptOut}" target="_blank" style="font-size:12px;line-height:18px;color:#68756e;text-decoration:underline;text-underline-offset:3px">I don’t wish to submit a photo</a></div>
    </td></tr>
    <tr><td class="email-pad" style="padding:16px 24px;background-color:#e8eeeb;border-top:1px solid #d4dfd9;font-family:Arial,Helvetica,sans-serif;color:#617069;font-size:11px;line-height:17px">
     <strong style="color:#294c3f;letter-spacing:.6px">TEST MODE</strong><br>Intended Agent: ${safeName}<br>Agent ID: ${safeAgentId}<br>Original recipient: ${safeIntended}<br>Actual test delivery: ${safeActual}
    </td></tr>
   </table>
  </td></tr>
 </table>
</body>
</html>`}
}
