const ALLOWED_ORIGINS=new Set([
 'https://3b-international.vercel.app',
 'https://localhost',
 'capacitor://localhost'
]);
const VIDEO_RE=/^[A-Za-z0-9_-]{11}$/;

function headers(request,cache='public, s-maxage=600, stale-while-revalidate=3600'){
 const origin=request.headers.get('origin')||'';
 const allow=ALLOWED_ORIGINS.has(origin)?origin:'https://3b-international.vercel.app';
 return{
  'content-type':'application/json; charset=utf-8',
  'cache-control':cache,
  'x-content-type-options':'nosniff',
  'access-control-allow-origin':allow,
  'vary':'Origin'
 };
}

function json(request,data,status=200,cache){
 return new Response(JSON.stringify(data),{status,headers:headers(request,cache)});
}

export default{
 fetch:async request=>{
  if(request.method==='OPTIONS'){
   return new Response(null,{status:204,headers:{
    ...headers(request,'no-store'),
    'access-control-allow-methods':'GET, OPTIONS',
    'access-control-allow-headers':'content-type'
   }});
  }
  if(request.method!=='GET')return json(request,{error:'Méthode non autorisée.'},405,'no-store');

  const id=new URL(request.url).searchParams.get('video')||'';
  if(!VIDEO_RE.test(id))return json(request,{error:'Identifiant vidéo invalide.'},400,'no-store');

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try{
   const target='https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id);
   const response=await fetch(target,{
    signal:controller.signal,
    headers:{'user-agent':'3B-International-Sport-Health/1.0'}
   });
   if(response.ok){
    const data=await response.json().catch(()=>({}));
    return json(request,{video:id,status:'available',available:true,title:data.title||'',provider:data.author_name||''});
   }
   if(response.status===401||response.status===404){
    return json(request,{video:id,status:'unavailable',available:false,reason:'removed_or_private'});
   }
   return json(request,{video:id,status:'unknown',available:null,reason:'provider_'+response.status},200,'public, s-maxage=60, stale-while-revalidate=300');
  }catch(error){
   const reason=error?.name==='AbortError'?'timeout':'network';
   return json(request,{video:id,status:'unknown',available:null,reason},200,'public, s-maxage=30, stale-while-revalidate=120');
  }finally{
   clearTimeout(timer);
  }
 }
};