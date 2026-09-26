import {authClient} from "../loyalty/client.js";

async function authHeaders(){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw new Error("Connecte-toi à ton compte 3B.");
 return{Authorization:`Bearer ${session.access_token}`};
}

async function request(path,{method="GET",body}={}){
 const headers=await authHeaders();
 const response=await fetch(path,{
  method,
  headers:{...headers,...(body===undefined?{}:{"Content-Type":"application/json"})},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
  signal:AbortSignal.timeout(20000),
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Service créateur Nosbloc indisponible.");
 return data;
}

function attemptId(){
 return globalThis.crypto?.randomUUID?.()||`00000000-0000-4000-8000-${Date.now().toString(16).padStart(12,"0").slice(-12)}`;
}

export const nosblocCommerce={
 config:()=>request("/api/nosbloc-commerce-config"),
 wallet:()=>request("/api/nosbloc-wallet"),
 connect:country=>request("/api/nosbloc-connect",{method:"POST",body:{country}}),
 checkout:productId=>request("/api/nosbloc-checkout",{method:"POST",body:{productId,attemptId:attemptId()}}),
 orderStatus:sessionId=>request(`/api/nosbloc-order-status?session_id=${encodeURIComponent(sessionId)}`),
};
