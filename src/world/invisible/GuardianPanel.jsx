import React,{useEffect,useRef,useState} from 'react';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {Button} from '../../design-system/index.jsx';
import {askGuardian,localGuardianReply} from './guardian-client.js';

export default function GuardianPanel({save}){
 const account=useLoyalty(),uid=account?.user?.id;
 const [messages,setMessages]=useState([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null),generation=useRef(0),owner=useRef(uid),dialogueOwner=useRef(uid);
 if(owner.current!==uid){owner.current=uid;generation.current++;request.current?.abort();}
 useEffect(()=>{
  request.current?.abort();dialogueOwner.current=uid;setMessages([]);setInput('');setError('');setBusy(false);
  return()=>{generation.current++;request.current?.abort();};
 },[uid]);
 async function send(event){
  event.preventDefault();const message=input.trim();if(busy||!message||message.length>800)return;
  const controller=new AbortController(),ticket=generation.current;request.current=controller;
  setBusy(true);setError('');setInput('');
  try{
   const reply=await askGuardian({save,message,history:messages.map(row=>({role:row.role,content:row.content})),expectedUser:uid,signal:controller.signal});
   if(ticket!==generation.current||controller.signal.aborted)return;
   setMessages(rows=>[...rows,{role:'user',content:message},{role:'assistant',content:reply.text,source:reply.source,unavailable:reply.unavailable}].slice(-6));
  }catch(e){if(ticket===generation.current&&!controller.signal.aborted){setError(e.message||'Le Gardien est indisponible.');setInput(message);}}
  finally{if(ticket===generation.current)setBusy(false);}
 }
 const intro=localGuardianReply(save,'bonjour');
 const visibleMessages=dialogueOwner.current===uid?messages:[];
 return <section className="invisible-guardian" aria-labelledby="invisible-guardian-title">
  <div className="invisible-section-heading"><div><span className="invisible-eyebrow">Gardienne de la Justice</span><h2 id="invisible-guardian-title">Parler à Céliane</h2></div><span className="invisible-pill">Dialogue éphémère</span></div>
  <p className="invisible-muted">Tes messages restent dans cette vue et s’effacent en la quittant. Pour une réponse IA, le message et jusqu’à trois échanges sont transmis au fournisseur, avec le contexte de jeu confirmé. Évite toute information personnelle.</p>
  <div className="invisible-conversation" role="log" aria-label="Dialogue avec Céliane" aria-live="polite" aria-relevant="additions">
   {!visibleMessages.length&&<div className="invisible-dialogue guardian"><small>Gardien narratif local · sans IA</small><p>{intro.text}</p></div>}
   {visibleMessages.map((row,i)=><div key={i} className={'invisible-dialogue '+(row.role==='user'?'player':'guardian')}><small>{row.role==='user'?'Toi':row.source==='ai'?'Céliane · réponse IA':'Céliane · récit narratif'}</small><p>{row.content}</p>{row.unavailable&&<small>Le service IA est indisponible ; cette réponse utilise le récit local.</small>}</div>)}
  </div>
  <form className="invisible-chat-form" onSubmit={send}>
   <label htmlFor="invisible-guardian-message">Ton message <small>{input.length}/800</small></label>
   <textarea id="invisible-guardian-message" value={input} maxLength={800} rows={3} placeholder="Céliane, peux-tu me donner un indice ?" onChange={event=>setInput(event.target.value)} disabled={busy}/>
   <div className="invisible-chat-actions"><Button className="invisible-button primary" type="submit" disabled={busy||!input.trim()}>{busy?'Céliane réfléchit…':'Envoyer'}</Button><Button variant="ghost" className="invisible-button" type="button" disabled={busy||!messages.length} onClick={()=>{setMessages([]);setInput('');setError('');}}>Effacer ce dialogue</Button></div>
  </form>
  {error&&<p className="invisible-notice error" role="alert">{error}</p>}
  <p className="invisible-muted">Le dialogue ne valide pas les énigmes et ne donne aucune récompense. La mémoire facultative conserve uniquement les événements de l’aventure, jamais ces messages. Le service IA ne conserve pas d’historique dans 3B ; les règles de conservation du fournisseur s’appliquent.</p>
 </section>;
}
