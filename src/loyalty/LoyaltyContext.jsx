import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {authClient,memberRequest,NOSBLOC_STAGING_APP} from './client.js';
import {EXPLORATIONS,tierFor} from '../../shared/loyalty.js';
import {passportFromProfile} from '../passport/identity.js';
import {createSnapshotGate,watchSession} from './session-state.js';
const Context=createContext(null);
const STAGING_COUNTRIES=new Set(['France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie']);
export const useLoyalty=()=>useContext(Context);

function stagingProfile(user){
 const meta=user?.user_metadata||{};
 let handle=String(meta.handle||user?.email?.split('@')[0]||'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'');
 if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(handle))handle='m'+String(user?.id||'membre3b').replace(/-/g,'').slice(0,12);
 const name=String(meta.display_name||meta.name||handle).trim().slice(0,80)||handle;
 const country=STAGING_COUNTRIES.has(meta.country)?meta.country:'France';
 return{user_id:user.id,handle,name,country,xp:0,points:0,theme:'discovery',created_at:user.created_at,public_badge_key:null,public_title:null,public_verified:false};
}

export function LoyaltyProvider({children}){
 const[session,setSession]=useState(null),[loading,setLoading]=useState(true),[data,setData]=useState(null),[error,setError]=useState('');
 const gate=useRef(null),sessionWatch=useRef(null),sessionFailed=useRef(false);
 if(!gate.current)gate.current=createSnapshotGate();
 useEffect(()=>{
  const watcher=watchSession(authClient.auth,s=>{gate.current.setUser(s?.user?.id||null);if(sessionFailed.current)setError('');sessionFailed.current=false;setSession(s);setLoading(false);},e=>{sessionFailed.current=true;setError(e?.message||'La connexion n’a pas pu être vérifiée. Réessaie.');setLoading(false);});
  sessionWatch.current=watcher;
  return()=>{watcher.stop();sessionWatch.current=null;gate.current.invalidate();};
 },[]);
 const owner=gate.current.accountTicket();
 const accept=result=>{if(gate.current.accept(result,owner)){setData(result);setError('');}return result;};
 const refresh=async()=>{
  const ticket=gate.current.begin();
  if(!ticket.userId){
   if(sessionFailed.current&&sessionWatch.current){setLoading(true);setError('');return sessionWatch.current.refresh();}
   return;
  }
  if(NOSBLOC_STAGING_APP){
   const user=session?.user;
   if(!user||user.id!==ticket.userId)return;
   const result={profile:stagingProfile(user),events:[],economy:null};
   if(gate.current.isCurrent(ticket)&&gate.current.accept(result,ticket)){setData(result);setError('');return result;}
   return;
  }
  try{
   const result=await memberRequest('snapshot',{},ticket.userId);
   if(gate.current.isCurrent(ticket)&&gate.current.accept(result,ticket)){setData(result);setError('');return result;}
  }catch(e){if(gate.current.isCurrent(ticket))setError(e?.message||'La synchronisation a échoué. Réessaie.');}
 };
 useEffect(()=>{setData(null);if(!sessionFailed.current)setError('');if(session?.user.id)refresh();},[session?.user.id]);
 useEffect(()=>{const focus=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',focus);return()=>document.removeEventListener('visibilitychange',focus);},[]);
 const owned=data?.profile?.user_id===session?.user?.id?data:null;
 const passport=passportFromProfile(owned?.profile,session?.user);
 return <Context.Provider value={{session,user:session?.user,profile:owned?.profile,passport,economy:owned?.economy||null,events:owned?.events||[],loading,error,accept,refresh}}>{children}</Context.Provider>;
}
export function remoteMember(profile){
 const passport=passportFromProfile(profile);
 if(!passport)return{name:'',email:'',isRegistered:false,status:'Non inscrit',level:'Découverte',points:0,memberId:'',passportId:'',country:'France',originCountry:'France',createdAt:''};
 return{name:passport.name,email:'',isRegistered:true,status:'Membre 3B · compte en ligne',level:tierFor(passport.xp).name,points:passport.points,memberId:passport.memberId,passportId:passport.passportId,country:passport.country,originCountry:passport.country,createdAt:passport.createdAt?new Date(passport.createdAt).toLocaleDateString('fr-FR'):''};
}
export function ExplorationRewards({page}){
 const account=useLoyalty();const[notice,setNotice]=useState('');
 useEffect(()=>{setNotice('');if(NOSBLOC_STAGING_APP||!account.user||!Object.hasOwn(EXPLORATIONS,page))return;const uid=account.user.id;let live=true;const timer=setTimeout(()=>{if(document.hidden)return;memberRequest('explore',{page},uid).then(result=>{if(live){account.accept(result);if(result.awarded)setNotice('Découverte récompensée : +20 XP · +2 points');}}).catch(()=>{});},12000);return()=>{live=false;clearTimeout(timer);};},[page,account.user?.id]);
 return notice?<div className="member-toast" role="status">{notice}</div>:null;
}
