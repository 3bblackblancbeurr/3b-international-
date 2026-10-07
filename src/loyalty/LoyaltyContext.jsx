import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {authClient,memberRequest} from './client.js';
import {EXPLORATIONS,tierFor} from '../../shared/loyalty.js';
import {passportFromProfile} from '../passport/identity.js';
import {createSnapshotGate,watchSession} from './session-state.js';
import {companionReward,companionCelebrate} from '../companion/events.js';
import {createCompanionProgressionTracker} from '../companion/progression.js';
const Context=createContext(null);
export const useLoyalty=()=>useContext(Context);
export function LoyaltyProvider({children}){
 const[session,setSession]=useState(null),[loading,setLoading]=useState(true),[data,setData]=useState(null),[error,setError]=useState('');
 const gate=useRef(null),sessionWatch=useRef(null),sessionFailed=useRef(false),companionProgression=useRef(null);
 if(!gate.current)gate.current=createSnapshotGate();
 if(!companionProgression.current)companionProgression.current=createCompanionProgressionTracker();
 useEffect(()=>{
  const watcher=watchSession(authClient.auth,s=>{gate.current.setUser(s?.user?.id||null);if(sessionFailed.current)setError('');sessionFailed.current=false;setSession(s);setLoading(false);},e=>{sessionFailed.current=true;setError(e?.message||'La connexion n’a pas pu être vérifiée. Réessaie.');setLoading(false);});
  sessionWatch.current=watcher;
  return()=>{watcher.stop();sessionWatch.current=null;gate.current.invalidate();};
 },[]);
 const owner=gate.current.accountTicket();
 const applySnapshot=(result,ticket)=>{
  const celebration=companionProgression.current.observe(result.profile,ticket);setData(result);setError('');
  // Let the caller's earned-reward reaction enter first; the level celebration
  // then joins the companion's bounded queue instead of being overwritten.
  if(celebration)queueMicrotask(()=>{const current=gate.current.accountTicket();if(current.userId===ticket.userId&&current.generation===ticket.generation)companionCelebrate(celebration);});
 };
 const accept=result=>{if(gate.current.accept(result,owner))applySnapshot(result,owner);return result;};
 const refresh=async()=>{
  const ticket=gate.current.begin();
  if(!ticket.userId){
   if(sessionFailed.current&&sessionWatch.current){setLoading(true);setError('');return sessionWatch.current.refresh();}
   return;
  }
  try{
   const result=await memberRequest('snapshot',{},ticket.userId);
   if(gate.current.isCurrent(ticket)&&gate.current.accept(result,ticket)){applySnapshot(result,ticket);return result;}
  }catch(e){if(gate.current.isCurrent(ticket))setError(e?.message||'La synchronisation a échoué. Réessaie.');}
 };
 useEffect(()=>{setData(null);if(!sessionFailed.current)setError('');if(session?.user.id)refresh();},[session?.user.id]);
 useEffect(()=>{const focus=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',focus);return()=>document.removeEventListener('visibilitychange',focus);},[]);
 const owned=data?.profile?.user_id===session?.user?.id?data:null;
 const passport=passportFromProfile(owned?.profile,session?.user);
 return <Context.Provider value={{session,user:session?.user,profile:owned?.profile,passport,identityClaimsComplete:owned?.identity_claims_complete===true,economy:owned?.economy||null,inventory:owned?.inventory||[],inventoryAvailable:owned?.inventory_available!==false,entitlements:owned?.entitlements||[],entitlementsAvailable:owned?.entitlements_available!==false,events:owned?.events||[],loading,error,accept,refresh}}>{children}</Context.Provider>;
}
export function remoteMember(profile){
 const passport=passportFromProfile(profile);
 if(!passport)return{name:'',email:'',isRegistered:false,status:'Non inscrit',level:'Découverte',points:0,memberId:'',passportId:'',country:'France',originCountry:'France',createdAt:''};
 return{name:passport.name,email:'',isRegistered:true,status:'Membre 3B · compte en ligne',level:tierFor(passport.xp).name,points:passport.points,memberId:passport.memberId,passportId:passport.passportId,country:passport.country,originCountry:passport.country,createdAt:passport.createdAt?new Date(passport.createdAt).toLocaleDateString('fr-FR'):''};
}
export function ExplorationRewards({page}){
 const account=useLoyalty();const[notice,setNotice]=useState('');
 useEffect(()=>{if(!notice)return;const expiry=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(expiry);},[notice]);
 useEffect(()=>{setNotice('');if(!account.user||!Object.hasOwn(EXPLORATIONS,page))return;const uid=account.user.id;let live=true;const timer=setTimeout(()=>{if(document.hidden)return;memberRequest('explore',{page},uid).then(result=>{if(live){account.accept(result);if(result.awarded){setNotice('Découverte récompensée : +20 XP · +2 points');companionReward({source:'exploration',page,xp:20,points:2});}}}).catch(()=>{});},12000);return()=>{live=false;clearTimeout(timer);};},[page,account.user?.id]);
 return notice?<div className={'member-toast'+(page==='world3b'?' member-toast-world':'')} role="status" aria-atomic="true">{notice.replace('+20 XP · +2 points','+20 XP compte · +2 points de fidélité')}</div>:null;
}
