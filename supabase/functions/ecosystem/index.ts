import {availableProviders,normalizeConversation,automaticReply} from './ai-router.js';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {fetchSports} from './sports.js';
import {validateDesign,textilePrompt} from './studio.js';
const BASE=Deno.env.get('SUPABASE_URL')!;
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(BASE,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const ORIGINS=new Set(['https://localhost','capacitor://localhost','https://3b-international.vercel.app','http://localhost:5174','http://127.0.0.1:5174']);
const rooms=['general','atelier','sport'];
const RULES_VERSION='2026-09-v1';
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const env=(key:string)=>Deno.env.get(key)||'';
const capability=()=>{const enabled=env('AI_ENABLED')==='true';return{image:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_IMAGE_MODEL'),gpt:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_CHAT_MODEL'),claude:enabled&&!!env('ANTHROPIC_API_KEY')&&!!env('ANTHROPIC_CHAT_MODEL'),gemini:enabled&&!!env('GEMINI_API_KEY')&&!!env('GEMINI_CHAT_MODEL')};};
const text=(value:unknown,min:number,max:number)=>{if(typeof value!=='string')throw new Failure(400,'Texte invalide.');const s=value.trim();if(s.length<min||s.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))throw new Failure(400,'Vérifie la longueur et le contenu du texte.');return s;};
const uuid=(value:unknown)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Failure(400,'Référence invalide.');return value;};
function check(result:any){if(result.error)throw new Failure(503,'La demande n’a pas abouti. Réessaie dans un instant.');return result.data;}
async function rate(uid:string,action:string,limit:number,window=60){const ok=check(await admin.rpc('loyalty_rate',{p_key:'ecosystem:'+action+':'+uid,p_limit:limit,p_window:window}));if(!ok)throw new Failure(429,'Tu as atteint la limite de cette action. Réessaie plus tard.');}
async function authenticate(req:Request){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');if(!token)throw new Failure(401,'Connecte-toi à ton compte 3B pour participer.');
 const{data,error}=await admin.auth.getUser(token);if(error||!data.user)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 let sid;try{sid=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
 if(!sid||!check(await admin.rpc('loyalty_session_valid',{p_user:data.user.id,p_session:sid})))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 const client=createClient(BASE,PUBLIC,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 return{uid:data.user.id,client};
}
async function sports(){
 const cache=check(await admin.from('sport_cache').select('payload,updated_at').eq('id','headlines').maybeSingle());
 if(cache&&Date.now()-Date.parse(cache.updated_at)<600000)return{...cache.payload,stale:false};
 try{const payload=await fetchSports();check(await admin.from('sport_cache').upsert({id:'headlines',payload,updated_at:payload.updatedAt}));return{...payload,stale:false};}
 catch{if(cache)return{...cache.payload,stale:true};throw new Failure(503,'Les sources sportives sont momentanément indisponibles. Réessaie dans quelques minutes.');}
}
async function signAssets(posts:any[]){return await Promise.all(posts.map(async p=>{if(!p.asset_path)return p;const{data}=await admin.storage.from('studio-3b').createSignedUrl(p.asset_path,600);return{...p,imageUrl:data?.signedUrl||null};}));}
async function participating(uid:string){const p=check(await admin.from('community_profiles').select('*').eq('user_id',uid).maybeSingle());if(!p?.listed||p.rules_version!==RULES_VERSION||!p.rules_accepted_at)throw new Failure(403,'Active ton profil et accepte les règles du collectif pour participer.');return p;}
async function visiblePost(client:any,id:string){const p=check(await client.from('community_posts').select('id,author_id').eq('id',id).maybeSingle());if(!p)throw new Failure(404,'Cette publication n’est plus disponible.');return p;}
async function providerFetch(url:string,headers:Record<string,string>,body:unknown,timeout=35000){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Failure(503,'Le fournisseur IA est momentanément indisponible.');return await r.json();}
async function aiReply(provider:string,messages:any[]){
 const instruction='Tu es l’assistant créatif de 3B International. Réponds en français, de façon claire et utile. Ne prétends jamais avoir exécuté une action externe ni consulté des données en direct sans outil.';
 if(provider==='gpt'){const r=await providerFetch('https://api.openai.com/v1/responses',{Authorization:'Bearer '+env('OPENAI_API_KEY')},{model:env('OPENAI_CHAT_MODEL'),instructions:instruction,input:messages,max_output_tokens:1600,store:false});return r.output?.flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('\n')||'Aucune réponse textuelle reçue.';}
 if(provider==='claude'){const r=await providerFetch('https://api.anthropic.com/v1/messages',{'x-api-key':env('ANTHROPIC_API_KEY'),'anthropic-version':'2023-06-01'},{model:env('ANTHROPIC_CHAT_MODEL'),system:instruction,messages,max_tokens:1600});return r.content?.filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n')||'Aucune réponse textuelle reçue.';}
 const model=env('GEMINI_CHAT_MODEL');if(!/^[a-zA-Z0-9._-]+$/.test(model))throw new Failure(503,'Modèle Gemini non configuré.');
 const r=await providerFetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{'x-goog-api-key':env('GEMINI_API_KEY')},{systemInstruction:{parts:[{text:instruction}]},contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:1600}});return r.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('\n')||'Aucune réponse textuelle reçue.';
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(req.method==='GET'){const section=new URL(req.url).searchParams.get('section');if(section==='sports')return reply(await sports());if(section==='capabilities')return reply(capability());throw new Failure(404,'Service introuvable.');}
  if(req.method!=='POST')throw new Failure(405,'Méthode non autorisée.');
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const reader=req.body?.getReader();let length=0,raw='';const decoder=new TextDecoder();if(reader)try{while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>100000){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}raw+=decoder.decode(chunk.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
  let body;try{body=JSON.parse(raw);}catch{throw new Failure(400,'Demande invalide.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new Failure(400,'Demande invalide.');
  const {uid,client}=await authenticate(req);const action=body.action;
  if(action==='snapshot'){
   await rate(uid,'read',120);const sort=body.sort==='votes'?'votes':'created_at';const category=['discussion','creation','challenge','collaboration'].includes(body.category)?body.category:null;
   let query=client.from('community_ranked_posts').select('*').order(sort,{ascending:false}).order('id').limit(60);if(category)query=query.eq('category',category);
   const [postResult,profileResult,mineResult,followResult,blockResult,staffResult]=await Promise.all([query,client.from('community_profiles').select('*').eq('listed',true).order('created_at',{ascending:false}).limit(100),client.from('community_profiles').select('*').eq('user_id',uid).maybeSingle(),client.from('community_follows').select('target_id'),client.from('community_blocks').select('target_id'),admin.from('community_staff').select('user_id').eq('user_id',uid).maybeSingle()]);
   const posts=check(postResult);const ids=posts.map((p:any)=>p.id);const likes=ids.length?check(await client.from('community_likes').select('post_id').eq('user_id',uid).in('post_id',ids)):[];
   const authors=[...new Set(posts.map((p:any)=>p.author_id))];const postAuthors=authors.length?check(await client.from('community_profiles').select('user_id,name,handle,kind').in('user_id',authors)):[];
   return reply({posts:await signAssets(posts),profiles:check(profileResult),postAuthors,mine:check(mineResult),follows:check(followResult),blocks:check(blockResult),likes,moderator:!!check(staffResult)});
  }
  if(action==='profile'){
   await rate(uid,'profile',6);const member=check(await admin.from('member_profiles').select('handle,name').eq('user_id',uid).single());
   const kind=body.kind==='creator'?'creator':'member',bio=text(body.bio||'',0,500),listed=body.listed===true;
   const previous=check(await admin.from('community_profiles').select('rules_version,rules_accepted_at').eq('user_id',uid).maybeSingle());
   const accepted=previous?.rules_version===RULES_VERSION&&!!previous?.rules_accepted_at;
   if(listed&&!accepted&&body.acceptRules!==true)throw new Failure(400,'Accepte les règles du collectif pour activer ton profil.');
   const consent=body.acceptRules===true&&!accepted?{rules_version:RULES_VERSION,rules_accepted_at:new Date().toISOString()}:{};
   check(await admin.from('community_profiles').upsert({user_id:uid,handle:member.handle,name:member.name,bio,kind,listed,...consent}));return reply({ok:true});
  }
  if(action==='chat-list'){
   await participating(uid);await rate(uid,'read',120);if(!rooms.includes(body.room))throw new Failure(400,'Salon invalide.');
   let query=client.from('community_chat').select('*').eq('room',body.room).order('created_at',{ascending:false}).limit(80);
   if(body.before)query=query.lt('created_at',text(body.before,10,40));const messages=check(await query).reverse();const authors=[...new Set(messages.map((m:any)=>m.author_id))];
   const profiles=authors.length?check(await client.from('community_profiles').select('user_id,name,handle').in('user_id',authors)):[];return reply({messages,profiles});
  }
  if(action==='post'){
   await participating(uid);await rate(uid,'post',5,3600);const category=['discussion','creation','challenge','collaboration'].includes(body.category)?body.category:null;if(!category)throw new Failure(400,'Catégorie invalide.');
   const design=body.design?validateDesign(body.design):null;let asset_path=null;if(body.assetPath){asset_path=text(body.assetPath,10,180);const asset=check(await admin.from('studio_assets').select('path').eq('path',asset_path).eq('user_id',uid).maybeSingle());if(!asset)throw new Failure(403,'Ce visuel ne t’appartient pas.');}
   check(await admin.from('community_posts').insert({id:uuid(body.id),author_id:uid,title:text(body.title,3,120),body:text(body.body,1,3000),category,design,asset_path}));return reply({ok:true});
  }
  if(action==='chat-send'){
   await participating(uid);await rate(uid,'chat',15);if(!rooms.includes(body.room))throw new Failure(400,'Salon invalide.');check(await admin.from('community_chat').insert({id:uuid(body.id),author_id:uid,room:body.room,body:text(body.text,1,1500)}));return reply({ok:true});
  }
  if(action==='like'){
   await participating(uid);await rate(uid,'like',30);const post=await visiblePost(client,uuid(body.id));if(post.author_id===uid)throw new Failure(400,'Les créateurs ne votent pas pour leur propre création.');
   if(body.active===true)check(await admin.from('community_likes').upsert({post_id:post.id,user_id:uid},{onConflict:'post_id,user_id',ignoreDuplicates:true}));else check(await admin.from('community_likes').delete().eq('post_id',post.id).eq('user_id',uid));return reply({ok:true});
  }
  if(action==='follow'||action==='block'){
   await participating(uid);await rate(uid,'relationships',20);const target=uuid(body.id);if(uid===target)throw new Failure(400,'Action invalide.');
   if(body.active===true){const exists=check(await admin.from('community_profiles').select('user_id').eq('user_id',target).maybeSingle());if(!exists)throw new Failure(404,'Profil introuvable.');}
   const table=action==='follow'?'community_follows':'community_blocks';if(body.active===true)check(await admin.from(table).upsert({user_id:uid,target_id:target},{ignoreDuplicates:true}));else check(await admin.from(table).delete().eq('user_id',uid).eq('target_id',target));return reply({ok:true});
  }
  if(action==='report'||action==='remove'){
   await rate(uid,action,10,3600);const id=uuid(body.id),kind=body.kind==='chat'?'chat':body.kind==='post'?'post':null;if(!kind)throw new Failure(400,'Type invalide.');
   const target=check(await client.from(kind==='chat'?'community_chat':'community_posts').select('id,author_id').eq('id',id).maybeSingle());if(!target)throw new Failure(404,'Contenu introuvable.');
   if(action==='remove'){if(target.author_id!==uid)throw new Failure(403,'Tu peux retirer uniquement ton contenu.');check(await admin.from(kind==='chat'?'community_chat':'community_posts').update({status:'removed'}).eq('id',id).eq('author_id',uid));}
   else check(await admin.from('community_reports').upsert({user_id:uid,target_id:id,kind,reason:text(body.reason,3,500)},{onConflict:'user_id,target_id,kind',ignoreDuplicates:true}));return reply({ok:true});
  }
  if(action==='reports'||action==='moderate'){
   const staff=check(await admin.from('community_staff').select('user_id').eq('user_id',uid).maybeSingle());if(!staff)throw new Failure(403,'Accès réservé à la modération.');await rate(uid,'moderation',30);
   if(action==='reports'){const reports=check(await admin.from('community_reports').select('*').eq('status','open').order('created_at').limit(100));const entries=await Promise.all(reports.map(async(r:any)=>({...r,content:check(await admin.from(r.kind==='chat'?'community_chat':'community_posts').select('*').eq('id',r.target_id).maybeSingle())})));return reply({reports:entries});}
   const report=check(await admin.from('community_reports').select('*').eq('id',uuid(body.id)).single());if(body.hide===true)check(await admin.from(report.kind==='chat'?'community_chat':'community_posts').update({status:'hidden'}).eq('id',report.target_id));check(await admin.from('community_reports').update({status:'resolved'}).eq('id',report.id));return reply({ok:true});
  }
  if(action==='chat-ai'){
   const caps=capability();if(!availableProviders(caps).length)throw new Failure(503,'Les services IA ne sont pas encore activés.');
   let messages;try{messages=normalizeConversation(body.messages);}catch(e){throw new Failure(400,e.message);}
   await rate(uid,'ai-chat',20,86400);await rate('global','ai-chat',100,86400);
   try{return reply(await automaticReply(caps,messages,aiReply));}catch(e){throw new Failure(503,e.message);}
  }
  if(action==='generate'){
   if(!capability().image)throw new Failure(503,'La génération IA n’est pas encore activée. Ton configurateur reste disponible.');
   const prompt=textilePrompt(validateDesign(body.design),text(body.idea||'',0,2000));await rate(uid,'ai-image',3,86400);await rate('global','ai-image',20,86400);
   const moderation=await providerFetch('https://api.openai.com/v1/moderations',{Authorization:'Bearer '+env('OPENAI_API_KEY')},{model:'omni-moderation-latest',input:prompt});if(moderation.results?.[0]?.flagged)throw new Failure(400,'Cette description ne peut pas être utilisée pour générer un visuel. Modifie ton idée.');
   const result=await providerFetch('https://api.openai.com/v1/images/generations',{Authorization:'Bearer '+env('OPENAI_API_KEY')},{model:env('OPENAI_IMAGE_MODEL'),prompt,n:1,size:'1024x1024',quality:'medium'},110000);
   const b64=result.data?.[0]?.b64_json;if(typeof b64!=='string'||b64.length>16777216)throw new Failure(503,'Aucun visuel exploitable reçu.');const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const path=uid+'/'+crypto.randomUUID()+'.png';
   check(await admin.storage.from('studio-3b').upload(path,bytes,{contentType:'image/png',upsert:false}));check(await admin.from('studio_assets').insert({path,user_id:uid}));const signed=check(await admin.storage.from('studio-3b').createSignedUrl(path,3600));return reply({assetPath:path,imageUrl:signed.signedUrl});
  }
  throw new Failure(404,'Action introuvable.');
 }catch(error){return reply({error:error instanceof Failure?error.message:error instanceof Error&&error.message==='Design invalide.'?error.message:'Le service est momentanément indisponible. Réessaie.'},error instanceof Failure?error.status:503);}
});

