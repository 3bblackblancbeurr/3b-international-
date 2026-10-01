export const PASSPORT_REQUEST_RESUME_MS=180000;
const validToken=token=>typeof token==='string'&&/^[0-9a-f]{64}$/.test(token);

// One App instance owns this reference. It is never written to storage, links
// or the auth session, and cannot approve a request on the user's behalf.
export function createPassportRequestResume({clock=()=>performance.now()}={}){
 let pending=null;
 const current=()=>{if(pending&&clock()>=pending.expiresAt)pending=null;return pending;};
 return {
  capture(token,userId=null){
   if(!validToken(token))return false;
   const previous=current();
   if(previous?.token===token)return false; // Re-renders cannot extend its life.
   pending={token,owner:userId||null,expiresAt:clock()+PASSPORT_REQUEST_RESUME_MS,awaitingLogin:false};return true;
  },
  waitForLogin(userId=null){
   const request=current();if(!request||request.owner&&request.owner!==userId)return false;
   request.awaitingLogin=!userId;return request.awaitingLogin;
  },
  sessionChanged(userId=null,{page,loading=false}={}){
   const before=pending,request=current();
   if(!request)return {changed:before!==pending,returnToPassport:false};
   if(request.owner&&request.owner!==userId){pending=null;return {changed:true,returnToPassport:false};}
   if(!request.owner&&userId&&!loading){
    const returnToPassport=request.awaitingLogin&&page==='member';
    request.owner=userId;request.awaitingLogin=false;
    return {changed:true,returnToPassport};
   }
   return {changed:false,returnToPassport:false};
  },
  read(userId=null){const request=current();return request&&request.owner===(userId||null)?request.token:null;},
  remaining(){const request=current();return request?Math.max(0,request.expiresAt-clock()):0;},
  handled(token,userId){const request=current();if(!request||!userId||request.owner!==userId||request.token!==token)return false;pending=null;return true;},
  clear(){const changed=!!pending;pending=null;return changed;},
 };
}

// Clean the incoming link once captured while retaining account-recovery params.
export function removePassportRequestFromUrl(href,page){
 const url=new URL(href);url.searchParams.delete('passport_request');
 if(url.searchParams.get('page')==='passport')url.searchParams.delete('page');
 if(page==='passport')url.hash='passeport';else if(page==='member')url.hash='membre';
 return url.pathname+url.search+url.hash;
}
