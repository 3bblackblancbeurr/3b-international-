import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {authClient,memberRequest} from './client.js';
import {EXPLORATIONS,tierFor} from '../../shared/loyalty.js';
const Context=createContext(null);
export const useLoyalty=()=>useContext(Context);
export function LoyaltyProvider({children}){
 const[session,setSession]=useState(null),[loading,setLoading]=useState(true),[data,setData]=useState(null),[error,setError]=useState('');
 const current=useRef(null);
 useEffect(()=>{let live=true;const apply=s=>{if(!live)return;current.current=s?.user.id||null;setSession(s);setLoading(false);};authClient.auth.getSession().then(({data})=>apply(data.session));const {data:{subscription}}=authClient.auth.onAuthStateChange((_event,s)=>apply(s));return()=>{live=false;subscription.unsubscribe();};},[]);
 const accept=result=>{if(result?.profile?.user_id===current.current){setData(result);setError('');}return result;};
 const refresh=async()=>{const uid=current.current;if(!uid)return;try{return accept(await memberRequest('snapshot',{},uid));}catch(e){if(current.current===uid)setError(e.message);}};
 useEffect(()=>{setData(null);setError('');if(session?.user.id)refresh();},[session?.user.id]);
 useEffect(()=>{const focus=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',focus);return()=>document.removeEventListener('visibilitychange',focus);},[]);
 const owned=data?.profile?.user_id===session?.user?.id?data:null;
 return <Context.Provider value={{session,user:session?.user,profile:owned?.profile,events:owned?.events||[],loading,error,accept,refresh}}>{children}</Context.Provider>;
}
export function remoteMember(profile){return{name:profile.name,email:'',isRegistered:true,status:'Membre 3B · compte en ligne',level:tierFor(profile.xp).name,points:profile.points,memberId:'3B-MEM-'+profile.user_id.toUpperCase(),passportId:'3B-PASS-'+profile.user_id.toUpperCase(),country:profile.country,originCountry:profile.country,createdAt:new Date(profile.created_at).toLocaleDateString('fr-FR')};}
export function ExplorationRewards({page}){
 const account=useLoyalty();const[notice,setNotice]=useState('');
 useEffect(()=>{setNotice('');if(!account.user||!Object.hasOwn(EXPLORATIONS,page))return;const uid=account.user.id;let live=true;const timer=setTimeout(()=>{if(document.hidden)return;memberRequest('explore',{page},uid).then(result=>{if(live){account.accept(result);if(result.awarded)setNotice('Découverte récompensée : +20 XP · +2 points');}}).catch(()=>{});},12000);return()=>{live=false;clearTimeout(timer);};},[page,account.user?.id]);
 return notice?<div className="member-toast" role="status">{notice}</div>:null;
}
