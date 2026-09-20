const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;

const ORIGINS=new Set([
  'https://localhost',
  'capacitor://localhost',
  'https://3b-international.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

class Failure extends Error{
  constructor(public status:number,message:string){super(message);}
}

async function api(path:string){
  const response=await fetch(BASE+path,{
    headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Failure(response.status>=500?503:400,'Lecture momentanément indisponible.');
  return data;
}

async function rpc(name:string,body:unknown){
  const response=await fetch(BASE+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json'},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Failure(response.status>=500?503:400,'Session momentanément indisponible.');
  return data;
}

async function authenticate(req:Request){
  const header=req.headers.get('authorization')||'';
  if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');

  const response=await fetch(BASE+'/auth/v1/user',{
    headers:{apikey:PUBLIC,Authorization:header},
    signal:AbortSignal.timeout(10000)
  });
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');

  let sid:string|undefined;
  try{
    sid=JSON.parse(atob(header.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;
  }catch{}
  if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid})){
    throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
  }
  return user.id as string;
}

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const cors={
    ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Cache-Control':'no-store',
    'Vary':'Origin'
  };
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});

  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);

  try{
    const uid=await authenticate(req);
    if(!await rpc('loyalty_rate',{p_key:uid+':world-bootstrap',p_limit:30,p_window:60})){
      throw new Failure(429,'Patiente un instant puis réessaie.');
    }

    const [profiles,worldRows,cityRows,economy]=await Promise.all([
      api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=user_id,handle,name,country,xp,points&limit=1'),
      api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=data,revision,updated_at&limit=1'),
      api('/rest/v1/nexus_cities?user_id=eq.'+uid+'&select=city_id,name,origin_country,city_level,city_xp,land_tier,day_mode,weather,ambience,visibility,updated_at&limit=1'),
      rpc('threeb_progress_snapshot_server',{p_user:uid})
    ]);

    const profile=profiles?.[0]||null;
    const world=worldRows?.[0]||null;
    const city=cityRows?.[0]||null;

    let placements:unknown[]=[];
    let districts:unknown[]=[];
    if(city?.city_id){
      [placements,districts]=await Promise.all([
        api('/rest/v1/nexus_city_placements?city_id=eq.'+city.city_id+'&placement_state=eq.placed&select=id,building_code,x,z,rotation,upgrade_level,variant&order=placed_at.asc'),
        api('/rest/v1/nexus_city_districts?city_id=eq.'+city.city_id+'&select=country,unlocked,level&order=country.asc')
      ]);
    }

    return reply({
      user_id:uid,
      passport:profile,
      economy,
      world,
      city:city?{...city,placements,districts}:null
    });
  }catch(error){
    return reply(
      {error:error instanceof Failure?error.message:'Le bootstrap du Monde est momentanément indisponible.'},
      error instanceof Failure?error.status:503
    );
  }
});
