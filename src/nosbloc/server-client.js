import {authClient,PUBLIC_KEY,SUPABASE_URL} from "../loyalty/client.js";
import {normalizeProjectPayload} from "./server-contract.js";

export const NOSBLOC_STAGING_PROJECT_REF="zykdfgahzqqanlyxjtbe";
export const NOSBLOC_PRODUCTION_PROJECT_REF="ttvhcezucsbbmnafrotq";
export const NOSBLOC_SERVER_ENABLED=String(import.meta.env?.VITE_NOSBLOC_SERVER_SYNC||import.meta.env?.VITE_NOSBLOC_STAGING_SYNC||"").toLowerCase()==="true";
export const NOSBLOC_SERVER_ENV=String(import.meta.env?.VITE_NOSBLOC_SERVER_ENV||(String(import.meta.env?.VITE_NOSBLOC_STAGING_SYNC||"").toLowerCase()==="true"?"staging":"production")).toLowerCase();
const expectedRef=NOSBLOC_SERVER_ENV==="staging"?NOSBLOC_STAGING_PROJECT_REF:NOSBLOC_PRODUCTION_PROJECT_REF;
const defaultSlug=NOSBLOC_SERVER_ENV==="staging"?"nosbloc-staging":"nosbloc";
export const NOSBLOC_SERVER_URL=String(import.meta.env?.VITE_NOSBLOC_SERVER_URL||`${SUPABASE_URL}/functions/v1/${defaultSlug}`);

function validEnvironment(){
 try{
  const base=new URL(SUPABASE_URL);
  const endpoint=new URL(NOSBLOC_SERVER_URL);
  return base.hostname===`${expectedRef}.supabase.co`
    && endpoint.origin===base.origin
    && endpoint.pathname===`/functions/v1/${defaultSlug}`;
 }catch{return false;}
}

export const NOSBLOC_SERVER_ENV_VALID=validEnvironment();

function idempotencyKey(){
 return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function nosblocServerRequest(action,body={},expectedUser){
 if(!NOSBLOC_SERVER_ENABLED){
  const error=new Error("Synchronisation serveur Nosbloc désactivée.");
  error.code="NOSBLOC_SERVER_DISABLED";
  throw error;
 }
 if(!NOSBLOC_SERVER_ENV_VALID){
  const error=new Error("Configuration Nosbloc refusée : environnement serveur incohérent.");
  error.code="NOSBLOC_SERVER_ENV_MISMATCH";
  throw error;
 }
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw new Error("Connecte-toi à ton compte 3B.");
 if(expectedUser&&session.user.id!==expectedUser)throw new Error("La session a changé. Reconnecte-toi.");
 const response=await fetch(NOSBLOC_SERVER_URL,{
  method:"POST",
  headers:{apikey:PUBLIC_KEY,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
  body:JSON.stringify({action,...body}),
  signal:AbortSignal.timeout(20000),
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Nosbloc serveur momentanément indisponible.");
 return data;
}

export const nosblocServer={
 snapshot:(expectedUser)=>nosblocServerRequest("snapshot",{},expectedUser),
 syncProject:(project,expectedUser)=>nosblocServerRequest("project_sync",{project:normalizeProjectPayload(project),idempotency:idempotencyKey()},expectedUser),
 privateTest:(projectId,project,expectedUser)=>nosblocServerRequest("version_private_test",{projectId,project:normalizeProjectPayload(project),note:"Test privé Nosbloc V2",idempotency:idempotencyKey()},expectedUser),
 submitReview:(projectId,project,expectedUser)=>nosblocServerRequest("review_submit",{projectId,project:normalizeProjectPayload(project),note:"Demande de publication Nosbloc V2",idempotency:idempotencyKey()},expectedUser),
};
