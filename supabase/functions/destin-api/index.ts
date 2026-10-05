// Credentials stay server-side. Every POST verifies the actual Auth user.
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleDestin} from './handler.ts';
const allowed = new Set(['https://3b-international.vercel.app','http://localhost:5173','http://localhost:4173','https://localhost','capacitor://localhost']);
for (const origin of (Deno.env.get('DESTIN_ALLOWED_ORIGINS') || '').split(',')) if (origin.trim()) allowed.add(origin.trim());
Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const send = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
  if (origin && !allowed.has(origin)) return send({error:'Origine non autorisée.'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Max-Age':'600'}});
  if (request.method==='GET') return send({service:'3B DESTIN',version:'1.2.0'});
  if (request.method!=='POST') return send({error:'Méthode non autorisée.'},405);
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ') || token.length>12000) return send({error:'Connecte-toi à ton compte 3B.'},401);
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error} = await db.auth.getUser(token.slice(7));
    if (error || !data.user) return send({error:'Ta session a expiré. Reconnecte-toi.'},401);
    if (Number(request.headers.get('content-length')||0)>524288) return send({error:'Projet trop volumineux.'},413);
    const text = await request.text();
    if (new TextEncoder().encode(text).length>524288) return send({error:'Projet trop volumineux.'},413);
    let body;
    try { body=JSON.parse(text); } catch { return send({error:'Requête illisible.'},400); }
    return await handleDestin(db,data.user.id,body,send);
  } catch (error) {
    console.error('destin-api',error instanceof Error?error.message:'failure');
    return send({error:'Connexion à 3B DESTIN momentanément indisponible. Le dernier parcours sauvegardé reste conservé.'},503);
  }
});
