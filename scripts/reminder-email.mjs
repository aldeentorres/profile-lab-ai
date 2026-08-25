const escapeHtml=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

export function buildTestReminderEmail(input,actualRecipient){
 const name=String(input.agentName??"").slice(0,160),agentId=String(input.agentId??"").slice(0,120),intended=String(input.intendedRecipientEmail??"").trim()||"Not available",upload=String(input.uploadUrl??""),optOut=String(input.optOutUrl??""),subject=`[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — ${name}`,footerText=`TEST MODE\nIntended Agent: ${name}\nAgent ID: ${agentId}\nOriginal recipient: ${intended}\nActual test delivery: ${actualRecipient}`,safeName=escapeHtml(name),safeAgentId=escapeHtml(agentId),safeIntended=escapeHtml(intended),safeActual=escapeHtml(actualRecipient),safeUpload=escapeHtml(upload),safeOptOut=escapeHtml(optOut);
 return{id:String(input.id??""),to:actualRecipient,subject,text:`Hi ${name},\n\nYour Profile Lab AI profile photo is still awaiting submission.\n\nPlease upload your photo so our design team can prepare your approved marketing image.\n\nUpload My Photo: ${upload}\n\nI don't wish to submit a photo: ${optOut}\n\n---\n${footerText}\n`,html:`<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="x-apple-disable-message-reformatting">
 <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
 <title>${escapeHtml(subject)}</title>
 <style>
  html,body{width:100%!important;margin:0!important;padding:0!important;background:#edf1ef}table,td{border-collapse:collapse!important;mso-table-lspace:0!important;mso-table-rspace:0!important}a{text-decoration:none}.preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}
  @media only screen and (max-width:520px){.email-container{width:100%!important}.portrait-panel{padding:26px 28px!important}.headline-wrap{padding:28px 24px 31px!important}.headline-small{font-size:24px!important;line-height:29px!important}.headline-due{font-size:51px!important;line-height:52px!important}.section-padding{padding-left:24px!important;padding-right:24px!important}.option-title{font-size:24px!important;line-height:27px!important}.body-copy{font-size:17px!important;line-height:25px!important}.button-link{display:block!important;width:auto!important;min-width:0!important}}
 </style>
</head>
<body style="margin:0;padding:0;background-color:#edf1ef">
 <div class="preheader">Your Profile Lab AI profile photo is still awaiting submission.</div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#edf1ef">
  <tr><td align="center" style="padding:24px 0">
   <table role="presentation" class="email-container" width="500" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:500px;background-color:#fffaf4">
    <tr><td style="padding:18px 22px 16px;background-color:#111814;font-family:Arial,Helvetica,sans-serif;color:#f8faf9">
     <div style="font-size:25px;line-height:25px;font-weight:900;letter-spacing:-1px">Profile Lab AI</div>
     <div style="padding-top:4px;font-size:10px;line-height:12px;font-weight:700;letter-spacing:1.8px;color:#8fa099">PROFILE STUDIO</div>
    </td></tr>
    <tr><td class="portrait-panel" align="center" style="padding:34px 50px;background-color:#dce9e2;font-family:Arial,Helvetica,sans-serif">
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:2px solid #294c3f;background-color:#edf3ef">
      <tr><td align="center" style="padding:29px 18px 23px">
       <div style="width:112px;height:112px;margin:0 auto;border-radius:56px;background-color:#294c3f;color:#f8faf9;font-size:51px;line-height:112px;font-weight:900;letter-spacing:-5px;text-align:center">P</div>
       <div style="padding-top:17px;font-size:10px;line-height:12px;font-weight:800;letter-spacing:2.2px;color:#587064">YOUR PROFILE PORTRAIT</div>
      </td></tr>
     </table>
    </td></tr>
    <tr><td class="headline-wrap" align="center" style="padding:34px 34px 37px;background-color:#294c3f;font-family:Arial,Helvetica,sans-serif;color:#f8faf9;text-align:center">
     <div class="headline-small" style="font-size:29px;line-height:34px;font-weight:600;letter-spacing:.3px;color:#f8faf9">YOUR PROFILE LAB AI PHOTO IS</div>
     <div class="headline-due" style="padding-top:2px;font-size:62px;line-height:64px;font-weight:900;letter-spacing:.2px;color:#ef6843">STILL DUE</div>
     <div style="padding-top:18px;font-size:18px;line-height:26px;font-weight:600;color:#dce7e1">One upload is all it takes to get your profile ready for design.</div>
    </td></tr>
    <tr><td class="section-padding" align="center" style="padding:41px 46px 38px;background-color:#fffaf4;font-family:Arial,Helvetica,sans-serif;color:#26332d">
     <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto"><tr>
      <td width="58" valign="middle" style="width:58px"><div style="width:50px;height:50px;border-radius:25px;background-color:#e6643f;font-size:27px;line-height:50px;font-weight:900;color:#fffaf4;text-align:center">1</div></td>
      <td class="option-title" valign="middle" style="font-size:27px;line-height:29px;font-weight:900;color:#294c3f;text-align:left">UPLOAD YOUR<br>PROFILE PHOTO</td>
     </tr></table>
     <div class="body-copy" style="padding:23px 0 25px;font-size:18px;line-height:27px;color:#405048;text-align:center"><strong style="color:#26332d">Hi ${safeName},</strong><br>Your Profile Lab AI profile photo is still awaiting submission. Upload it so our design team can prepare your approved marketing image.</div>
     <a class="button-link" href="${safeUpload}" target="_blank" style="display:inline-block;min-width:250px;padding:14px 22px;background-color:#e6643f;border-radius:25px;font-size:16px;line-height:20px;font-weight:900;letter-spacing:.3px;color:#ffffff;text-align:center">UPLOAD MY PHOTO&nbsp;&nbsp;&gt;</a>
     <div style="padding-top:21px"><a href="${safeOptOut}" target="_blank" style="font-size:12px;line-height:18px;color:#68756e;text-decoration:underline;text-underline-offset:3px">I don’t wish to submit a photo</a></div>
    </td></tr>
    <tr><td style="padding:18px 22px;background-color:#e8eeeb;border-top:1px solid #d4dfd9;font-family:Arial,Helvetica,sans-serif;color:#617069;font-size:11px;line-height:17px">
     <strong style="color:#294c3f;letter-spacing:.8px">TEST MODE</strong><br>Intended Agent: ${safeName}<br>Agent ID: ${safeAgentId}<br>Original recipient: ${safeIntended}<br>Actual test delivery: ${safeActual}
    </td></tr>
   </table>
  </td></tr>
 </table>
</body>
</html>`}
}
