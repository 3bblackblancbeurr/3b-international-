import {guardianContext,guardianInstructions,narrativeGuardian,safeGuardianText} from './guardian-story.js';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ORIGINS=new Set(['https://localhost','capacitor://localhost','https://3b-international.vercel.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
class Failure extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new Failure(status,message);};
const clean=(value,max)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,'Message invalide ou trop long.');
 return value.trim();
};
export function normalizeGuardianRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Demande invalide.');
 if(body.action==='dialog'){
  if(Object.keys(body).some(key=>!['action','message','history'].includes(key)))fail(400,'Contexte client non autorisé.');
  const message=clean(body.message,800),history=body.history??[];
  if(!Array.isArray(history)||history.length>6)fail(400,'Conversation trop longue.');
  const rows=history.map(row=>{
   if(!row||!['user','assistant'].includes(row.role)||Object.keys(row).some(key=>!['role','content'].includes(key)))fail(400,'Conversation invalide.');
   return{role:row.role,content:clean(row.content,row.role==='user'?800:900)};
  });
  if(rows.some((row,i)=>row.role===(i%2===0?'assistant':'user'))||rows.length%2!==0)fail(400,'Ordre de conversation invalide.');
  if(rows.reduce((n,row)=>n+row.content.length,0)+message.length>4000)fail(400,'Conversation trop longue.');
  return{action:'dialog',message,history:rows};
 }
 if(body.action==='cooperationSnapshot'||body.action==='contribute'){
  if(Object.keys(body).some(key=>!['action','realm'].includes(key)))fail(400,'Demande collective invalide.');
  if(body.action==='cooperationSnapshot'&&body.realm!==undefined)fail(400,'Demande collective invalide.');
  if(body.realm!==undefined&&typeof body.realm!=='string')fail(400,'Choisis une affinité du Cercle.');
  return{action:body.action,realm:body.realm??null};
 }
 fail(400,'Action inconnue.');
}

async function readBody(req){
 if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'Format invalide.');
 const reader=req.body?.getReader();if(!reader)fail(400,'Demande invalide.');
 const decoder=new TextDecoder();let text='',bytes=0;
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>16384){await reader.cancel();fail(413,'Demande trop volumineuse.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 try{return JSON.parse(text);}catch{fail(400,'Demande invalide.');}
}

export function createGuardianHandler({base,serviceKey,anonKey,env=()=>'',fetchImpl=fetch,episode,normalizeState}){
 const api=async(path,body)=>{
  const response=await fetchImpl(base+path,{method:body===undefined?'GET':'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   const raw=String(data?.message||'');
   if(/session_expired/.test(raw))fail(401,'Ta session a expiré. Reconnecte-toi.');
   if(/fragment_required/.test(raw))fail(409,'Synchronise d’abord ton Fragment de la Justice.');
   if(/passport_required/.test(raw))fail(403,'Un Passeport 3B actif est nécessaire.');
   if(/invalid_realm/.test(raw))fail(400,'Choisis une des huit affinités du Cercle.');
   if(/realm_locked/.test(raw))fail(409,'Ton écho est déjà lié à une affinité.');
   fail(503,'Le service du Monde Invisible est momentanément indisponible.');
  }
  return data;
 };
 const rpc=(name,body)=>api('/rest/v1/rpc/'+name,body);
 const validSession=async(uid,sid)=>{if(await rpc('loyalty_session_valid',{p_user:uid,p_session:sid})!==true)fail(401,'Ta session a expiré. Reconnecte-toi.');};
 const activePassport=async uid=>{
  const profile=(await api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=passport_state&limit=1'))?.[0];
  if(profile?.passport_state!=='active')fail(403,'Un Passeport 3B actif est nécessaire pour ce dialogue.');
 };
 const authenticate=async req=>{
  const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))fail(401,'Connecte-toi à ton compte 3B.');
  const response=await fetchImpl(base+'/auth/v1/user',{headers:{apikey:anonKey,Authorization:auth},signal:AbortSignal.timeout(10000)}),user=await response.json().catch(()=>null);
  if(!response.ok||!UUID.test(user?.id||'')||user.is_anonymous)fail(401,'Ta session a expiré. Reconnecte-toi.');
  let sid;try{sid=JSON.parse(atob(auth.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
  if(!UUID.test(sid||''))fail(401,'Ta session a expiré. Reconnecte-toi.');
  await validSession(user.id,sid);return{uid:user.id,sid};
 };
 const rate=async(key,limit,window)=>{if(await rpc('loyalty_rate',{p_key:key,p_limit:limit,p_window:window})!==true)fail(429,'Le Gardien doit se reposer. Réessaie plus tard.');};
 const provider=async(invisible,body)=>{
  const narrative=()=>({source:'narrative',guardian:episode.guardian,text:narrativeGuardian(invisible,body.message,episode)});
  if(env('AI_ENABLED')!=='true'||!env('OPENAI_API_KEY')||!env('OPENAI_CHAT_MODEL'))return narrative();
  await rate('invisible:ai:global',100,86400);
  try{
   const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+env('OPENAI_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify({model:env('OPENAI_CHAT_MODEL'),instructions:guardianInstructions(guardianContext(invisible,episode)),input:[...body.history,{role:'user',content:body.message}],max_output_tokens:512,store:false,tools:[]}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)return narrative();
   const result=await response.json(),text=safeGuardianText(result.output?.flatMap(row=>row.content||[]).filter(row=>row.type==='output_text').map(row=>row.text).join('\n'));
   return text?{source:'ai',guardian:episode.guardian,text}:narrative();
  }catch{return narrative();}
 };
 return async req=>{
  const origin=req.headers.get('origin')||'',cors={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body,status=200)=>Response.json(body,{status,headers:cors});
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
  try{
   const body=normalizeGuardianRequest(await readBody(req)),{uid,sid}=await authenticate(req);
   if(body.action==='dialog'){
    await activePassport(uid);
    await rate('invisible:session:'+sid,6,60);
    await rate('invisible:user:'+uid,12,60);
    await rate('invisible:day:'+uid,60,86400);
    const row=(await api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=data&limit=1'))?.[0];
    const invisible=normalizeState(row?.data?.invisible),result=await provider(invisible,body);
    // Revocation during a provider request must not return a response to an ended session.
    await validSession(uid,sid);await activePassport(uid);return reply(result);
   }
   await rate('invisible:cooperation:'+uid,20,60);
   const params={p_user:uid,p_session:sid};
   return reply(await rpc(body.action==='contribute'?'invisible_echo_contribute':'invisible_echo_snapshot',body.action==='contribute'?{...params,p_realm:body.realm}:params));
  }catch(error){return reply({error:error instanceof Failure?error.message:'Le service du Monde Invisible est momentanément indisponible.'},error instanceof Failure?error.status:503);}
 };
}
