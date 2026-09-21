import React,{useEffect,useRef,useState} from 'react';

const SITE_KEY=String(import.meta.env.VITE_TURNSTILE_SITE_KEY||'').trim();
const SCRIPT_ID='threeb-turnstile-script';

function loadTurnstile(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 return new Promise((resolve,reject)=>{
  let script=document.getElementById(SCRIPT_ID);
  const ready=()=>window.turnstile?resolve(window.turnstile):reject(new Error('Turnstile indisponible.'));
  if(script){
   script.addEventListener('load',ready,{once:true});
   script.addEventListener('error',()=>reject(new Error('Turnstile indisponible.')),{once:true});
   return;
  }
  script=document.createElement('script');
  script.id=SCRIPT_ID;
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;
  script.defer=true;
  script.addEventListener('load',ready,{once:true});
  script.addEventListener('error',()=>reject(new Error('Turnstile indisponible.')),{once:true});
  document.head.appendChild(script);
 });
}

export default function TurnstileField({onToken}){
 const host=useRef(null),widget=useRef(null);
 const[failed,setFailed]=useState(false);

 useEffect(()=>{
  if(!SITE_KEY||!host.current)return;
  let active=true;
  loadTurnstile().then(api=>{
   if(!active||!host.current)return;
   widget.current=api.render(host.current,{
    sitekey:SITE_KEY,
    theme:'dark',
    size:'flexible',
    callback:token=>onToken?.(token),
    'expired-callback':()=>onToken?.(''),
    'error-callback':()=>{onToken?.('');setFailed(true);}
   });
  }).catch(()=>setFailed(true));
  return()=>{
   active=false;
   onToken?.('');
   if(widget.current!=null&&window.turnstile){
    try{window.turnstile.remove(widget.current);}catch{}
   }
  };
 },[onToken]);

 if(!SITE_KEY)return null;
 return <div className="account-turnstile" aria-label="Protection anti-robot">
  <div ref={host}/>
  {failed&&<small>La vérification anti-robot n’a pas chargé. Recharge la page avant de réessayer.</small>}
 </div>;
}
