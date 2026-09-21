#!/usr/bin/env node
const command=process.argv[2]||'health';
const rawBase=process.env.THREEB_UNREAL_REMOTE_URL||'http://127.0.0.1:30010';

function baseUrl(raw){
  const url=new URL(raw);
  const allowed=new Set(['127.0.0.1','localhost','[::1]']);
  if(url.protocol!=='http:') throw new Error('Le bridge Unreal 3B exige HTTP local.');
  if(!allowed.has(url.hostname)) throw new Error('Refus de contacter un serveur Unreal non local.');
  url.pathname=''; url.search=''; url.hash='';
  return url.toString().replace(/\/$/,'');
}
async function call(base,path,{method='GET',body}={}){
  const response=await fetch(base+path,{
    method,
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(5000)
  });
  const text=await response.text();
  let data=text;
  try{data=text?JSON.parse(text):null;}catch{}
  if(!response.ok) throw new Error('Unreal Remote Control HTTP '+response.status+': '+String(text).slice(0,500));
  return data;
}
async function health(base){
  const info=await call(base,'/remote/info');
  const routes=Array.isArray(info?.Routes)?info.Routes:Array.isArray(info?.routes)?info.routes:[];
  return {ok:true,bridge:'3B Unreal Editor Bridge',mode:'read-only-v1',remote_url:base,route_count:routes.length};
}
async function actors(base){
  const result=await call(base,'/remote/object/call',{
    method:'PUT',
    body:{
      objectPath:'/Script/EditorScriptingUtilities.Default__EditorLevelLibrary',
      functionName:'GetAllLevelActors'
    }
  });
  const list=Array.isArray(result?.ReturnValue)?result.ReturnValue:[];
  return {ok:true,actor_count:list.length,actors:list};
}
async function main(){
  const base=baseUrl(rawBase);
  if(command==='health') return console.log(JSON.stringify(await health(base),null,2));
  if(command==='actors') return console.log(JSON.stringify(await actors(base),null,2));
  if(command==='snapshot'){
    const [h,a]=await Promise.all([health(base),actors(base)]);
    return console.log(JSON.stringify({ok:true,captured_at:new Date().toISOString(),health:h,level:a},null,2));
  }
  throw new Error('Commande non autorisée. Utilise health, actors ou snapshot.');
}
main().catch(error=>{console.error(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error)},null,2));process.exitCode=1;});
