import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {fetchSports} from './sports.js';
import {aiCapabilities} from './ai-capabilities.js';
import {createNewsService,NewsFailure} from './news.js';

const BASE=Deno.env.get('SUPABASE_URL')!;
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS=new Set([
 'https://3b-international.vercel.app',
 'https://localhost',
 'capacitor://localhost',
 'http://localhost:5173',
 'http://127.0.0.1:5173',
 'http://localhost:5174',
 'http://127.0.0.1:5174',
 'http://localhost:5183',
 'http://127.0.0.1:5183'
]);
const admin=createClient(BASE,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const env=(key:string)=>Deno.env.get(key)||'';
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const capability=()=>aiCapabilities(env);
const news=createNewsService();
async function rate(req:Request,action:string,limit:number,window=60){
 const forwarded=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
 const key=await hash('ecosystem-public:'+action+':'+forwarded);
 const {data,error}=await admin.rpc('loyalty_rate',{p_key:key,p_limit:limit,p_window:window});
 if(error)throw new Failure(503,'Service momentanément indisponible.');
 if(!data)throw new Failure(429,'Trop de demandes. Réessaie dans un instant.');
}
async function gamesCatalog(){
 const {data,error}=await admin
  .from('app_games_catalog')
  .select('slug,title,subtitle,description,route,badge,category,status,module_type,module_url,api_slug,requires_auth,sort_order,metadata')
  .eq('enabled',true)
  .order('sort_order',{ascending:true});
 if(error)throw new Failure(503,'Le catalogue Jeux 3B est momentanément indisponible.');
 return{
  version:2,
  loaderUrl:BASE + '/functions/v1/games-remote-loader',
  loaderElement:'threeb-remote-game',
  backEvent:'threeb-game-back',
  routePattern:'/jeux/:slug',
  games:(data||[]).map((game:any)=>({
   slug:game.slug,
   title:game.title,
   subtitle:game.subtitle,
   description:game.description,
   route:game.route,
   badge:game.badge,
   category:game.category,
   status:game.status,
   moduleType:game.module_type,
   moduleUrl:game.module_url,
   apiSlug:game.api_slug,
   requiresAuth:Boolean(game.requires_auth),
   playable:game.status==='playable',
   healthUrl:BASE + '/functions/v1/ecosystem-public?section=game-health&slug=' + encodeURIComponent(game.slug),
   metadata:game.metadata||{}
  }))
 };
}

async function gameHealth(slugInput:string|null){
 const slug=String(slugInput||'').trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug))throw new Failure(400,'Jeu invalide.');
 const {data:game,error}=await admin
  .from('app_games_catalog')
  .select('slug,title,route,status,module_type,module_url,api_slug,enabled,metadata')
  .eq('slug',slug)
  .eq('enabled',true)
  .maybeSingle();
 if(error||!game)throw new Failure(404,'Jeu introuvable.');

 const checks:any={catalog:true};
 const probe=async(url:string,options:RequestInit={})=>{
  try{
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});
   return response.status;
  }catch{return 0;}
 };

 const moduleStatus=await probe(String(game.module_url||''));
 checks.clientModule=moduleStatus===200;

 const loaderSlug=String(game.metadata?.loaderSlug||'games-remote-loader');
 const loaderStatus=await probe(BASE+'/functions/v1/'+encodeURIComponent(loaderSlug));
 checks.remoteLoader=loaderStatus===200;

 const backendSlug=String(game.api_slug||'');
 const backendStatus=backendSlug
  ? await probe(BASE+'/functions/v1/'+encodeURIComponent(backendSlug),{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'status'})
    })
  : 0;
 checks.backend=backendStatus===401||backendStatus===200;

 return{
  slug:game.slug,
  title:game.title,
  route:game.route,
  playable:game.status==='playable',
  ready:Object.values(checks).every(Boolean),
  checks,
  contract:{
   apiVersion:Number(game.metadata?.apiVersion||1),
   backendVersion:Number(game.metadata?.backendVersion||0),
   moduleVersion:Number(game.metadata?.moduleVersion||0),
   loaderVersion:Number(game.metadata?.loaderVersion||0),
   shellContractVersion:Number(game.metadata?.shellContractVersion||0),
   routePattern:String(game.metadata?.routePattern||'/jeux/:slug')
  }
 };
}

async function sportsFeed(){
 const {data:cache,error:cacheError}=await admin.from('sport_cache').select('payload,updated_at').eq('id','headlines').maybeSingle();
 if(cacheError)throw new Failure(503,'Le flux sportif est momentanément indisponible.');
 if(cache?.payload?.version===2&&Date.now()-Date.parse(cache.updated_at)<600000)return{...cache.payload,stale:false};
 try{
  const payload=await fetchSports();
  const {error}=await admin.from('sport_cache').upsert({id:'headlines',payload,updated_at:payload.updatedAt});
  if(error)throw error;
  return{...payload,stale:false};
 }catch{
  if(cache)return{...cache.payload,stale:true};
  throw new Failure(503,'Les sources sportives sont momentanément indisponibles.');
 }
}
function originAllowed(origin:string){
 if(ORIGINS.has(origin))return true;
 try{
  const url=new URL(origin);
  return url.protocol==='https:'&&url.hostname.endsWith('.vercel.app')&&url.hostname.startsWith('3b-international');
 }catch{return false;}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const allowed=originAllowed(origin);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Headers':'apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,OPTIONS',...(allowed?{'Access-Control-Allow-Origin':origin}:{})};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(origin&&!allowed)return reply({error:'Origine non autorisée.'},403);
 if(req.method!=='GET')return reply({error:'Méthode non autorisée.'},405);
 try{
  const section=new URL(req.url).searchParams.get('section');
  if(section==='capabilities'){await rate(req,'capabilities',60,60);return reply(capability());}
  if(section==='sports'){await rate(req,'sports',30,60);return reply(await sportsFeed());}
  if(section==='news'){await rate(req,'news',20,60);return reply(await news.get({country:new URL(req.url).searchParams.get('country')||'FR'}));}
  if(section==='games'){await rate(req,'games',60,60);return reply(await gamesCatalog());}
  if(section==='game-health'){
   await rate(req,'game-health',30,60);
   return reply(await gameHealth(new URL(req.url).searchParams.get('slug')));
  }
  throw new Failure(404,'Service introuvable.');
 }catch(error){
  const known=error instanceof Failure||error instanceof NewsFailure;
  return reply({error:known?error.message:'Service momentanément indisponible.'},known?error.status:503);
 }
});
