import {defaultDeck,validateDeck,makeDuel,duelStep} from './duel.js';
import {blankSave,normalizeSave} from './rules.js';
const BASE=Deno.env.get('SUPABASE_URL')!,ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://3b-international.vercel.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
async function api(path:string,body?:unknown){const r=await fetch(BASE+path,{method:body===undefined?'GET':'POST',headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});const data=await r.json().catch(()=>null);if(!r.ok)throw new Failure(r.status>=500?503:400,data?.message||'Arène momentanément indisponible.');return data;}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
async function userFor(req:Request){const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))throw new Failure(401,'Connecte-toi au compte 3B pour affronter un joueur.');const r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:auth},signal:AbortSignal.timeout(10000)}),user=await r.json();if(!r.ok||!user.id||user.is_anonymous)throw new Failure(401,'Compte 3B connecté requis.');let sid;try{sid=JSON.parse(atob(auth.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Reconnecte-toi pour reprendre ton duel.');return user.id;}
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const reader=req.body?.getReader();let bytes=0,text='';const decoder=new TextDecoder();if(reader)try{while(true){const c=await reader.read();if(c.done)break;bytes+=c.value.byteLength;if(bytes>4096){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}text+=decoder.decode(c.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  let body;try{body=JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
  if(!body||!['status','deck','create','join','queue','cancel','home','move'].includes(body.action))throw new Failure(400,'Action inconnue.');
  const uid=await userFor(req);if(!await rpc('loyalty_rate',{p_key:uid+':card-arena',p_limit:90,p_window:60}))throw new Failure(429,'Patiente quelques secondes.');
  const row=(await api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=data'))?.[0],save=normalizeSave(row?.data||blankSave());
  const payload:any={initial:defaultDeck()};
  if(body.action==='deck'){try{payload.deck=validateDeck(body.deck,save);}catch(e){throw new Failure(400,e.message);}}
  if(body.action==='create'){if(!['friendly','tournament'].includes(body.mode))throw new Failure(400,'Mode inconnu.');payload.mode=body.mode;}
  if(body.action==='join'){if(typeof body.code!=='string'||!/^[A-F0-9]{8}$/.test(body.code.toUpperCase()))throw new Failure(400,'Le code comporte huit caractères.');payload.code=body.code.toUpperCase();}
  let snapshot=await rpc('card_arena_command',{p_user:uid,p_action:body.action==='move'?'status':body.action,p_payload:payload});
  // Resolve timeouts and initialize server snapshots before accepting a move.
  for(const match of snapshot.matches||[])if(match.status==='active'){
   let state=match.state;
   if(!state){state=makeDuel(match.decks,crypto.getRandomValues(new Uint8Array(1))[0]%2);await rpc('card_arena_commit',{p_match:match.id,p_revision:match.revision,p_state:state});}
   else if(Date.parse(match.deadline)<=Date.now()){state=duelStep(state,state.turn,{type:'timeout'});await rpc('card_arena_commit',{p_match:match.id,p_revision:match.revision,p_state:state});}
  }
  if(body.action==='move'){
   if(!UUID.test(body.match||'')||!Number.isInteger(body.revision)||!body.move||!['strike','guard','power','swap','relic','forfeit'].includes(body.move.type))throw new Failure(400,'Action de duel invalide.');
   const match=(await api('/rest/v1/card_arena_matches?id=eq.'+body.match+'&select=*'))?.[0];
   if(!match||![match.p1,match.p2].includes(uid)||match.room_id!==snapshot.room?.id)throw new Failure(403,'Ce duel ne t’appartient pas.');
   if(match.revision!==body.revision)throw new Failure(409,'Le duel a avancé. Ton écran va se synchroniser.');
   if(match.status!=='active'||!match.state)throw new Failure(409,'Cette manche est terminée.');
   if(Date.parse(match.deadline)<=Date.now())throw new Failure(409,'Le temps de ce tour est écoulé.');
   let state;try{state=duelStep(match.state,match.p1===uid?0:1,{type:body.move.type,index:body.move.index});}catch(e){throw new Failure(400,e.message);}
   if(!await rpc('card_arena_commit',{p_match:match.id,p_revision:match.revision,p_state:state}))throw new Failure(409,'Une autre action a déjà été validée.');
  }
  snapshot=await rpc('card_arena_command',{p_user:uid,p_action:'status',p_payload:payload});
  return reply({...snapshot,collection:save.collection});
 }catch(e){return reply({error:e instanceof Failure?e.message:'Le service de l’arène est momentanément indisponible.'},e instanceof Failure?e.status:503);}
});
