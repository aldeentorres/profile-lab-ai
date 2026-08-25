// Optional Puter session for a kiosk that must generate without an interactive "Connect" click.
//
// SECURITY, and it is not a small point: Puter.js runs entirely in the browser, so this token has to
// reach client JavaScript to be usable at all. Anyone with devtools on the kiosk can read it. That makes
// it a fit for a controlled, staffed machine and never for a public deployment — scope the Puter account
// to what a demo needs and rotate the token when the event is over. Leave PUTER_AUTH_TOKEN unset and the
// studio behaves exactly as before, offering the one-time interactive Connect button instead.
//
// It is served from here rather than inlined at build time so the token stays out of the committed
// bundle and can be changed by editing .env.local and restarting, without a rebuild.
export async function GET(){
 const token=process.env.PUTER_AUTH_TOKEN?.trim();
 return Response.json(token?{configured:true,token}:{configured:false},{headers:{"Cache-Control":"no-store"}});
}
