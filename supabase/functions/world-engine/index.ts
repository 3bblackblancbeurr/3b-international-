import {applyWorldAction} from './engine.js';
import {blankSave,normalizeSave} from './rules.js';
const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://localhost','capacitor://localhost','https://3b-international.vercel.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
class Failure extends Error {constructor(public status:number,message:string){super(message);}}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const r=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
 const data=await r.json().catch(()=>null);if(!r.ok)throw new Failure(r.status>=500?503:400,'Synchronisation momentanément indisponible.');return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
async function authenticate(req:Request){
 const header=req.headers.get('authorization')||'';if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
 const user=await response.json();if(!response.ok||!user.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 let sid;try{sid=JSON.parse(atob(header.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
 if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');return user.id;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',bytes=0;
  if(reader)try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>65536){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  let body;try{body=JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
  if(!body||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.device)||!Array.isArray(body.commands)||body.commands.length>100)throw new Failure(400,'Journal invalide.');
  for(let i=0;i<body.commands.length;i++){const item=body.commands[i];if(!Number.isSafeInteger(item.seq)||item.seq<1||!item.action||JSON.stringify(item.action).length>1000||(i&&item.seq!==body.commands[i-1].seq+1))throw new Failure(400,'Séquence invalide.');}
  const uid=await authenticate(req);
  if(!await rpc('loyalty_rate',{p_key:uid+':world-engine',p_limit:60,p_window:60}))throw new Failure(429,'Patiente un instant puis réessaie.');
  for(let attempt=0;attempt<3;attempt++){
   let row=(await api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=*'))?.[0];
   if(!row){
    // Only the previous server save is migrated; arbitrary client JSON is never imported into account state.
    const old=(await api('/rest/v1/member_world_saves?user_id=eq.'+uid+'&select=data'))?.[0];
    const data=normalizeSave(old?.data||blankSave());
    try{await api('/rest/v1/member_world_state',{user_id:uid,data,legacy:!!old,walk_baseline:data.walked});}catch{if(attempt===2)throw new Failure(409,'Autre appareil actif. Réessaie.');}
    row=(await api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=*'))?.[0];
   }
   if(!row)throw new Failure(503,'Le compte est en préparation.');
   const device=(await api('/rest/v1/member_world_devices?user_id=eq.'+uid+'&device=eq.'+body.device+'&select=sequence'))?.[0];
   let seq=Number(device?.sequence||0),data=normalizeSave(row.data);const rejected=[];
   for(const entry of body.commands){
    if(entry.seq<=seq)continue;
    if(entry.seq!==seq+1)throw new Failure(409,'Une action manque dans le journal. Rouvre le monde pour synchroniser.');
    try{
     const next=applyWorldAction(data,entry.action);
     if(entry.action.type==='walk'&&next.walked-Number(row.walk_baseline)>(Date.now()-Date.parse(row.created_at))/1000*3+200)throw Error('Cette distance est trop rapide.');
     data=next;
    }catch(error){rejected.push({seq:entry.seq,message:error instanceof Error?error.message:'Action non validée.'});}
    seq=entry.seq;
   }
   if(seq===Number(device?.sequence||0))return reply({data,sequence:seq,revision:row.revision,rejected,legacy:row.legacy});
   const ok=await rpc('world_commit',{p_user:uid,p_revision:row.revision,p_data:data,p_device:body.device,p_sequence:seq});
   if(ok)return reply({data,sequence:seq,revision:Number(row.revision)+1,rejected,legacy:row.legacy});
  }
  throw new Failure(409,'Autre appareil actif. La synchronisation va réessayer.');
 }catch(error){return reply({error:error instanceof Failure?error.message:'Le service du monde est momentanément indisponible.'},error instanceof Failure?error.status:503);}
});
