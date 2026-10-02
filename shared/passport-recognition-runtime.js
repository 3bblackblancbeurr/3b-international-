export class PassportFailure extends Error {
  constructor(status,message){super(message);this.status=status;}
}

export async function readPassportBody(req,limit=24576) {
  if((req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json') throw new PassportFailure(415,'Un corps JSON est requis.');
  const reader=req.body?.getReader(),decoder=new TextDecoder();
  let text='',bytes=0;
  if(reader) try {
    while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>limit){await reader.cancel();throw new PassportFailure(413,'Demande trop volumineuse.');}text+=decoder.decode(chunk.value,{stream:true});}
    text+=decoder.decode();
  } finally {reader.releaseLock();}
  let body;try{body=JSON.parse(text);}catch{throw new PassportFailure(400,'Demande invalide.');}
  if(!body || typeof body!=='object' || Array.isArray(body)) throw new PassportFailure(400,'Demande invalide.');
  return body;
}

export function passportRuntime(getEnv,fetcher=fetch) {
  const base=(getEnv('SUPABASE_URL')||'').replace(/\/$/,'');
  const app=(getEnv('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
  function bundled(bundle,legacy){
    const raw=getEnv(bundle);
    if(raw)try{const keys=JSON.parse(raw);if(typeof keys?.default==='string')return keys.default;const key=Object.values(keys||{}).find(value=>typeof value==='string'&&value);if(key)return key;}catch{}
    return getEnv(legacy)||'';
  }
  const admin=bundled('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
  const publicKey=bundled('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY')||getEnv('SUPABASE_PUBLISHABLE_KEY')||'';
  async function api(path,body,method=body===undefined?'GET':'POST') {
    if(!base || !admin) throw new PassportFailure(503,'Configuration serveur indisponible.');
    const response=await fetcher(base+path,{method,headers:{apikey:admin,...(admin.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+admin}),'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new PassportFailure(response.status>=500?503:response.status===401||response.status===403?403:400,'La vérification serveur a été refusée ou est indisponible.');
    return data;
  }
  async function authenticate(req) {
    const authorization=req.headers.get('authorization')||'';
    if(!authorization.startsWith('Bearer ') || authorization.length>8192 || !publicKey) throw new PassportFailure(401,'Connecte-toi à ton compte 3B.');
    const response=await fetcher(base+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization},signal:AbortSignal.timeout(10000)});
    const user=await response.json().catch(()=>null);
    if(!response.ok || !user?.id) throw new PassportFailure(401,'Ta session a expiré. Reconnecte-toi.');
    let sessionId='';
    try{const part=authorization.slice(7).split('.')[1]||'';sessionId=String(JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4))).session_id||'');}catch{}
    if(!/^[0-9a-f-]{36}$/i.test(sessionId) || await api('/rest/v1/rpc/loyalty_session_valid',{p_user:user.id,p_session:sessionId})!==true) throw new PassportFailure(401,'Ta session a expiré. Reconnecte-toi.');
    return {userId:String(user.id),sessionId};
  }
  return {getEnv,api,authenticate,appURL:app,baseURL:base};
}

export const passportOrigins = app => new Set([app,'https://localhost','capacitor://localhost','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
