const BASE=Deno.env.get('SUPABASE_URL')||'';

class Failure extends Error{constructor(public status:number,message:string){super(message);}}

function bundledKey(bundleEnv:string,legacyEnv:string){
 const raw=Deno.env.get(bundleEnv);
 if(raw)try{
  const parsed=JSON.parse(raw);
  if(typeof parsed?.default==='string'&&parsed.default)return parsed.default;
  const first=Object.values(parsed||{}).find(v=>typeof v==='string'&&v);
  if(typeof first==='string')return first;
 }catch{}
 return Deno.env.get(legacyEnv)||'';
}

const ADMIN=bundledKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC=bundledKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
const ORIGINS=new Set([
 'https://3b-international.vercel.app','https://localhost','capacitor://localhost',
 'http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174'
]);
const REQUEST_CATEGORIES=new Set(['account','sport','shop','creator','partnership','event','press','technical','privacy','other']);
const OWNER_STATUSES=new Set(['new','in_progress','done','archived']);
const OWNER_SEVERITIES=new Set(['info','important','urgent','critical']);
const OWNER_CATEGORIES=new Set(['accounts','community','moderation','sport','shop','requests','security','secret3b','games','world','ai','system','privacy','marketplace']);

function adminHeaders(body=false){
 if(!ADMIN)throw new Failure(503,'Configuration serveur incomplète.');
 return{
  apikey:ADMIN,
  ...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),
  ...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})
 };
}
async function api(path:string,init:RequestInit={}){
 const response=await fetch(BASE+path,{...init,headers:{...adminHeaders(init.body!==undefined),...(init.headers||{})},signal:init.signal||AbortSignal.timeout(12000)});
 const raw=await response.text();let data:any=null;try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Le Centre 3B est momentanément indisponible.');
 return data;
}
async function rpc(name:string,body:unknown){return api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});}
function jwtPayload(token:string){try{const raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const padded=raw+'='.repeat((4-raw.length%4)%4);return JSON.parse(atob(padded));}catch{return null;}}
function enc(value:unknown){return encodeURIComponent(String(value??''));}
function text(value:unknown,min:number,max:number,label='Texte'){
 if(typeof value!=='string')throw new Failure(400,label+' invalide.');
 const out=value.trim();
 if(out.length<min||out.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(out))throw new Failure(400,label+' invalide.');
 return out;
}
function intId(value:unknown){const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw new Failure(400,'Référence invalide.');return n;}
function uuid(value:unknown){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Failure(400,'Référence invalide.');return value;}

async function authenticate(req:Request){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 if(!PUBLIC)throw new Failure(503,'Clé publique absente.');
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:auth},signal:AbortSignal.timeout(10000)});
 const user=await response.json().catch(()=>null);
 if(!response.ok||!user?.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 const payload=jwtPayload(auth.slice(7)),sid=payload?.session_id;
 if(!sid||await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid})!==true)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return user;
}
async function ownerSettings(){
 const rows=await api('/rest/v1/control_center_settings?singleton=eq.true&select=enabled,owner_email,owner_user_id&limit=1');
 return rows?.[0]||null;
}
async function ownerAccess(user:any){
 const settings=await ownerSettings();
 if(!settings?.enabled)return false;
 const ownerId=String(settings.owner_user_id||'').trim();
 if(ownerId)return user.id===ownerId;
 const ownerEmail=String(settings.owner_email||'').trim().toLowerCase();
 return !!ownerEmail&&String(user.email||'').trim().toLowerCase()===ownerEmail&&!!user.email_confirmed_at;
}
async function requireOwner(user:any){
 if(!await ownerAccess(user))throw new Failure(403,'Centre propriétaire réservé au propriétaire 3B.');
}
async function rate(uid:string,action:string,limit:number,window=60){
 if(await rpc('loyalty_rate',{p_key:'notification-center:'+action+':'+uid,p_limit:limit,p_window:window})!==true)throw new Failure(429,'Trop de demandes. Réessaie un peu plus tard.');
}
async function insert(path:string,row:unknown){return api('/rest/v1/'+path,{method:'POST',body:JSON.stringify(row)});}
async function patch(path:string,row:unknown){return api('/rest/v1/'+path,{method:'PATCH',body:JSON.stringify(row)});}
async function audit(owner:string,action:string,targetType:string|null,targetRef:string|null,before:any={},after:any={},detail:any={}){
 await insert('owner_action_log',{owner_user_id:owner,action,target_type:targetType,target_ref:targetRef,before_state:before||{},after_state:after||{},detail:detail||{}}).catch(()=>{});
}
async function memberNotify(userId:string,eventKey:string,kind:string,severity:string,title:string,body:string,route:string|null,metadata:any={}){
 await insert('member_notifications',{user_id:userId,event_key:eventKey,kind,severity,title,body,route,metadata}).catch(()=>{});
}
async function ownerEvent(eventKey:string,category:string,eventType:string,severity:string,title:string,summary:string,actor:string|null,subjectType:string|null,subjectRef:string|null,payload:any={}){
 await insert('owner_inbox_events',{event_key:eventKey,category,event_type:eventType,severity,title,summary,actor_user_id:actor,subject_type:subjectType,subject_ref:subjectRef,payload}).catch(()=>{});
}
async function bootstrap(user:any){
 const [memberUnread,owner]=await Promise.all([
  api('/rest/v1/member_notifications?user_id=eq.'+enc(user.id)+'&read_at=is.null&select=id'),
  ownerAccess(user)
 ]);
 let ownerUnread=0,ownerUrgent=0;
 if(owner){
  const [unread,urgent]=await Promise.all([
   api('/rest/v1/owner_inbox_events?read_at=is.null&status=not.eq.archived&select=id'),
   api('/rest/v1/owner_inbox_events?severity=in.(urgent,critical)&status=in.(new,in_progress)&select=id')
  ]);
  ownerUnread=unread?.length||0;ownerUrgent=urgent?.length||0;
 }
 return{memberUnread:memberUnread?.length||0,ownerAccess:owner,ownerUnread,ownerUrgent};
}
async function memberList(uid:string){
 const [notifications,requests]=await Promise.all([
  api('/rest/v1/member_notifications?user_id=eq.'+enc(uid)+'&select=id,kind,severity,title,body,route,metadata,read_at,created_at&order=created_at.desc&limit=100'),
  api('/rest/v1/threeb_requests?user_id=eq.'+enc(uid)+'&select=id,category,subject,message,status,priority,owner_reply,answered_at,created_at,updated_at&order=created_at.desc&limit=50')
 ]);
 return{notifications:notifications||[],requests:requests||[]};
}
async function ownerList(body:any){
 const status=body.status&&OWNER_STATUSES.has(body.status)?body.status:null;
 const severity=body.severity&&OWNER_SEVERITIES.has(body.severity)?body.severity:null;
 const category=body.category&&OWNER_CATEGORIES.has(body.category)?body.category:null;
 let path='/rest/v1/owner_inbox_events?select=id,event_key,category,event_type,severity,title,summary,actor_user_id,subject_type,subject_ref,payload,status,read_at,assigned_to,created_at,updated_at&order=created_at.desc&limit=150';
 if(status)path+='&status=eq.'+enc(status);
 if(severity)path+='&severity=eq.'+enc(severity);
 if(category)path+='&category=eq.'+enc(category);
 if(body.unread===true)path+='&read_at=is.null';
 const search=typeof body.search==='string'?body.search.trim().slice(0,80):'';
 if(search){
  const safe=search.replace(/[,%()*]/g,' ');
  path+='&or=(title.ilike.*'+enc(safe)+'*,summary.ilike.*'+enc(safe)+'*)';
 }
 const [events,requests,openReports,pendingSport,failedDelivery]=await Promise.all([
  api(path),
  api('/rest/v1/threeb_requests?status=in.(new,in_progress)&select=id,user_id,category,subject,message,status,priority,owner_reply,created_at,updated_at&order=created_at.desc&limit=100'),
  api('/rest/v1/community_reports?status=eq.open&select=id'),
  api('/rest/v1/sport_challenge_entries?status=eq.submitted&select=user_id,challenge_id'),
  api('/rest/v1/shop_notification_log?state=eq.failed&select=stripe_session_id')
 ]);
 const actorIds=[...new Set([...(events||[]).map((x:any)=>x.actor_user_id),...(requests||[]).map((x:any)=>x.user_id)].filter(Boolean))];
 const profiles=actorIds.length?await api('/rest/v1/member_profiles?user_id=in.('+actorIds.join(',')+')&select=user_id,handle,name,country'):[];
 return{
  events:events||[],requests:requests||[],profiles:profiles||[],
  stats:{
   unread:(events||[]).filter((x:any)=>!x.read_at).length,
   urgent:(events||[]).filter((x:any)=>['urgent','critical'].includes(x.severity)&&['new','in_progress'].includes(x.status)).length,
   openReports:openReports?.length||0,
   pendingSport:pendingSport?.length||0,
   failedDelivery:failedDelivery?.length||0,
   openRequests:requests?.length||0
  }
 };
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const cors={
  ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
 };
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>24000)throw new Failure(413,'Demande trop volumineuse.');
  let body:any;try{body=JSON.parse(raw);}catch{throw new Failure(400,'Demande invalide.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Failure(400,'Demande invalide.');
  const user=await authenticate(req),uid=user.id as string,action=String(body.action||'bootstrap');

  if(action==='bootstrap'){await rate(uid,'bootstrap',90);return reply(await bootstrap(user));}
  if(action==='member-list'){await rate(uid,'member-list',60);return reply(await memberList(uid));}
  if(action==='member-read'){
   await rate(uid,'member-read',60);
   const now=new Date().toISOString();
   if(body.all===true)await patch('member_notifications?user_id=eq.'+enc(uid)+'&read_at=is.null',{read_at:now});
   else await patch('member_notifications?id=eq.'+intId(body.id)+'&user_id=eq.'+enc(uid),{read_at:now});
   return reply({ok:true,...await bootstrap(user)});
  }
  if(action==='request-submit'){
   await rate(uid,'request-submit',6,3600);
   const category=String(body.category||'');if(!REQUEST_CATEGORIES.has(category))throw new Failure(400,'Catégorie invalide.');
   const subject=text(body.subject,3,140,'Objet'),message=text(body.message,10,4000,'Message');
   const rows=await insert('threeb_requests',{user_id:uid,category,subject,message});
   const request=rows?.[0];if(!request?.id)throw new Failure(503,'La demande n’a pas pu être enregistrée.');
   await ownerEvent('request:'+request.id,'requests','request.created',category==='privacy'?'urgent':'important','Nouvelle demande 3B',subject,uid,'request',request.id,{category});
   await memberNotify(uid,'request.confirmed:'+request.id,'request.confirmed','info','Demande envoyée','Ta demande a bien été transmise à 3B.','notifications',{request_id:request.id});
   return reply({ok:true,request:{id:request.id,status:request.status||'new'}},201);
  }

  await requireOwner(user);
  if(action==='owner-list'){await rate(uid,'owner-list',90);return reply(await ownerList(body));}
  if(action==='owner-update'){
   await rate(uid,'owner-update',90);
   const id=intId(body.id);
   const rows=await api('/rest/v1/owner_inbox_events?id=eq.'+id+'&select=*');const before=rows?.[0];
   if(!before)throw new Failure(404,'Élément introuvable.');
   const change:any={updated_at:new Date().toISOString()};
   if(body.read===true)change.read_at=new Date().toISOString();
   if(body.read===false)change.read_at=null;
   if(body.status){if(!OWNER_STATUSES.has(body.status))throw new Failure(400,'Statut invalide.');change.status=body.status;}
   change.assigned_to=uid;
   const afterRows=await patch('owner_inbox_events?id=eq.'+id,change);
   const after=afterRows?.[0]||{...before,...change};
   await audit(uid,'owner.inbox.update','owner_inbox_event',String(id),before,after,{});
   return reply({ok:true,event:after,...await bootstrap(user)});
  }
  if(action==='owner-request-reply'){
   await rate(uid,'owner-request-reply',30,3600);
   const id=uuid(body.id),replyText=text(body.reply,2,4000,'Réponse');
   const rows=await api('/rest/v1/threeb_requests?id=eq.'+enc(id)+'&select=*');const before=rows?.[0];
   if(!before)throw new Failure(404,'Demande introuvable.');
   const afterRows=await patch('threeb_requests?id=eq.'+enc(id),{owner_reply:replyText,status:'answered',answered_at:new Date().toISOString(),updated_at:new Date().toISOString()});
   const after=afterRows?.[0]||{...before,owner_reply:replyText,status:'answered'};
   await memberNotify(before.user_id,'request.answered:'+id+':'+Date.now(),'request.answered','important','Réponse de 3B',replyText,'notifications',{request_id:id});
   await audit(uid,'owner.request.reply','request',id,before,after,{});
   return reply({ok:true,request:after});
  }
  if(action==='owner-clear-restriction'){
   await rate(uid,'owner-clear-restriction',30,3600);
   const target=uuid(body.user);
   const rows=await api('/rest/v1/community_moderation_state?user_id=eq.'+enc(target)+'&select=*');const before=rows?.[0]||{};
   await patch('community_moderation_state?user_id=eq.'+enc(target),{strike_score:0,restricted_until:null,updated_at:new Date().toISOString()});
   await insert('community_moderation_events',{user_id:target,source_kind:'profile',decision:'manual_clear',severity:1,reasons:['owner_clear'],excerpt:'Restriction levée par le propriétaire.',resolved_at:new Date().toISOString(),resolved_by:uid});
   await memberNotify(target,'moderation.cleared:'+Date.now(),'moderation.cleared','info','Accès au collectif rétabli','La restriction de participation a été levée.','community',{});
   await audit(uid,'owner.moderation.clear','member',target,before,{strike_score:0,restricted_until:null},{});
   return reply({ok:true});
  }
  throw new Failure(400,'Action inconnue.');
 }catch(error){
  const status=error instanceof Failure?error.status:503;
  const message=error instanceof Failure?error.message:'Le Centre 3B est momentanément indisponible.';
  return reply({error:message},status);
 }
});
