import React,{useEffect,useRef,useState} from 'react';
import {createTurnstileLoader} from './turnstile-loader.js';

const SITE_KEY=String(import.meta.env.VITE_TURNSTILE_SITE_KEY||'').trim();
const loadTurnstile=createTurnstileLoader({window,document});

export default function TurnstileField({onToken}){
 const host=useRef(null),onTokenRef=useRef(onToken);
 onTokenRef.current=onToken;
 const[failed,setFailed]=useState(false);
 const[attempt,setAttempt]=useState(0);

 useEffect(()=>{
  if(!SITE_KEY||!host.current)return;
  let active=true,widget=null,api=null;
  setFailed(false);
  loadTurnstile().then(loaded=>{
   if(!active||!host.current)return;
   api=loaded;
   widget=api.render(host.current,{
    sitekey:SITE_KEY,
    theme:'dark',
    size:'flexible',
    callback:token=>{if(active){onTokenRef.current?.(token);setFailed(false);}},
    'expired-callback':()=>{if(active)onTokenRef.current?.('');},
    'error-callback':()=>{if(active){onTokenRef.current?.('');setFailed(true);}}
   });
  }).catch(()=>{if(active)setFailed(true);});
  return()=>{
   active=false;
   onTokenRef.current?.('');
   if(widget!=null&&api){
    try{api.remove(widget);}catch{}
   }
  };
 },[attempt]);

 if(!SITE_KEY)return null;
 return <div className="account-turnstile" aria-label="Protection anti-robot">
  <div ref={host}/>
  {failed&&<div role="status"><small>La vérification anti-robot n’a pas chargé. Tu peux réessayer sans perdre ton formulaire.</small><button type="button" onClick={()=>setAttempt(value=>value+1)}>Réessayer la vérification</button></div>}
 </div>;
}
