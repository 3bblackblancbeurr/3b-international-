import {Failure,rpc,serve} from '../_shared/passport-server.ts';
const APP=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
serve(async(_req,body)=>{
 if(body.action!=='readiness')throw new Failure(404,'Action inconnue.');
 const capability=await rpc('passport_auth_capability',{});
 const enabled=Deno.env.get('PASSPORT_INITIAL_PASSKEY_ENABLED')==='true'&&capability?.enabled===true&&
   !!capability.qualifiedAt&&capability.origin===APP&&capability.rpId===new URL(APP).hostname&&new URL(APP).protocol==='https:';
 return {enabled,mode:'supabase_auth_passkey',experimental:true,origin:APP,rpId:new URL(APP).hostname};
});
