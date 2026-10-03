import {Capacitor} from "@capacitor/core";
import {authClient} from "../loyalty/client.js";

async function sessionHeaders(){
  const {data:{session}}=await authClient.auth.getSession();
  if(!session)throw Error("Reconnecte-toi à ton Passeport 3B.");
  return {Authorization:`Bearer ${session.access_token}`};
}

async function api(path,options={}){
  const headers={...(await sessionHeaders()),...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})};
  const response=await fetch(path,{...options,headers,signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Boutique Premium momentanément indisponible.");
  return data;
}

export function digitalPurchasePlatform(){
  const platform=Capacitor.getPlatform();
  if(platform==="android")return "google_play";
  if(platform==="ios")return "app_store";
  return "web";
}

export function digitalProviderLabel(provider){
  return provider==="google_play"?"Google Play":provider==="app_store"?"App Store":"Web sécurisé";
}

export async function loadDigitalStore(scope="all"){
  return api("/api/catalog?__3b_route=digital-store-catalog&scope="+encodeURIComponent(scope));
}

export async function beginDigitalPurchase(product){
  const platform=digitalPurchasePlatform();
  if(platform==="google_play"){
    return {native:true,provider:platform,ready:false,productConfigured:!!product?.provider?.googlePlay,productId:product?.provider?.googlePlay||null};
  }
  if(platform==="app_store"){
    return {native:true,provider:platform,ready:false,productConfigured:!!product?.provider?.appStore,productId:product?.provider?.appStore||null};
  }
  const attemptId=globalThis.crypto?.randomUUID?.();
  if(!attemptId)throw Error("Impossible de sécuriser cette tentative d’achat.");
  return api("/api/catalog?__3b_route=digital-store-checkout",{method:"POST",body:JSON.stringify({productCode:product.code,attemptId})});
}

export async function confirmDigitalPurchase(sessionId){
  return api("/api/catalog?__3b_route=digital-store-status&session_id="+encodeURIComponent(sessionId));
}

export async function spendDigitalCredits(product,attemptId){
  if(!attemptId)throw Error('Identifiant d’achat manquant.');
  return api('/api/catalog?__3b_route=digital-store-spend',{method:'POST',body:JSON.stringify({productCode:product.code,attemptId})});
}
