import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {fetchSports} from './sports.js';

const BASE=Deno.env.get('SUPABASE_URL')!;
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS=new Set([
 'https://3b-international.vercel.app',
 'https://localhost',
 'capacitor://localhost',
 'http://localhost:5173',
 'http://127.0.0.1:5173',
 'http://localhost:5174',
 'http://127.0.0.1:5174'
]);
const admin=createClient(BASE,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const env=(key:string)=>Deno.env.get(key)||'';
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const capability=()=>{const enabled=env('AI_ENABLED')==='true';return{
 image:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_IMAGE_MODEL'),
 gpt:enabled&&!!env('OPENAI_API_KEY')&&!!env('OPENAI_CHAT_MODEL'),
 claude:enabled&&!!env('ANTHROPIC_API_KEY')&&!!env('ANTHROPIC_CHAT_MODEL'),
 gemini:enabled&&!!env('GEMINI_API_KEY')&&!!env('GEMINI_CHAT_MODEL')
};};
async function rate(req:Request,action:string,limit:number,window=60){
 const forwarded=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
 const key=await hash('ecosystem-public:'+action+':'+forwarded);
 const {data,error}=await admin.rpc('loyalty_rate',{p_key:key,p_limit:limit,p_window:window});
 if(error)throw new Failure(503,'Service momentanément indisponible.');
 if(!data)throw new Failure(429,'Trop de demandes. Réessaie dans un instant.');
}
async function sportsFeed(){
 const {data:cache,error:cacheError}=await admin.from('sport_cache').select('payload,updated_at').eq('id','headlines').maybeSingle();
 if(cacheError)throw new Failure(503,'Le flux sportif est momentanément indisponible.');
 if(cache&&Date.now()-Date.parse(cache.updated_at)<600000)return{...cache.payload,stale:false};
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
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Headers':'apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,OPTIONS',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 if(req.method!=='GET')return reply({error:'Méthode non autorisée.'},405);
 try{
  const section=new URL(req.url).searchParams.get('section');
  if(section==='capabilities'){await rate(req,'capabilities',60,60);return reply(capability());}
  if(section==='sports'){await rate(req,'sports',30,60);return reply(await sportsFeed());}
  throw new Failure(404,'Service introuvable.');
 }catch(error){
  return reply({error:error instanceof Failure?error.message:'Service momentanément indisponible.'},error instanceof Failure?error.status:503);
 }
});
