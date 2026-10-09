import React,{useEffect,useRef,useState} from 'react';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {Button} from '../../design-system/index.jsx';
import {askGuardian,localGuardianReply,readGuardianCapabilities} from './guardian-client.js';
import {createGuardianReader} from './guardian-voice.js';
import {getInvisibleEpisode} from './catalog.js';

export default function GuardianPanel({save}){
 const account=useLoyalty(),uid=account?.user?.id;
 const episode=getInvisibleEpisode(save?.invisible?.activeEpisode),scope=(uid||'local')+':'+episode.id+':'+(save?.invisible?.memoryRevision||0);
 const [messages,setMessages]=useState([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [capability,setCapability]=useState(null),[speaking,setSpeaking]=useState(false),[voiceSupported,setVoiceSupported]=useState(false);
 const reader=useRef(null),request=useRef(null),generation=useRef(0),owner=useRef(scope),dialogueOwner=useRef(scope);
 if(owner.current!==scope){owner.current=scope;generation.current++;request.current?.abort();}
 useEffect(()=>{
  request.current?.abort();dialogueOwner.current=scope;setMessages([]);setInput('');setError('');setBusy(false);
  const speech=typeof window!=='undefined'?window.speechSynthesis:null;
  reader.current=createGuardianReader({synthesis:speech,createUtterance:typeof window!=='undefined'&&window.SpeechSynthesisUtterance?text=>new window.SpeechSynthesisUtterance(text):undefined,onSpeaking:setSpeaking});
  setVoiceSupported(reader.current.supported);setSpeaking(false);
  const onVoices=()=>setVoiceSupported(reader.current?.supported===true);speech?.addEventListener?.('voiceschanged',onVoices);
  const onHidden=()=>{if(document.hidden)reader.current?.stop();};document.addEventListener('visibilitychange',onHidden);
  return()=>{generation.current++;request.current?.abort();reader.current?.dispose();reader.current=null;document.removeEventListener('visibilitychange',onHidden);speech?.removeEventListener?.('voiceschanged',onVoices);};
 },[scope]);
 useEffect(()=>{
  const controller=new AbortController();setCapability(null);
  if(uid)readGuardianCapabilities(uid,controller.signal).then(result=>{if(!controller.signal.aborted)setCapability(result);}).catch(()=>{if(!controller.signal.aborted)setCapability({reason:'unavailable',aiConfigured:false});});
  return()=>controller.abort();
 },[uid]);
 async function send(event){
  event.preventDefault();const message=input.trim();if(busy||!message||message.length>800)return;
  const controller=new AbortController(),ticket=generation.current;request.current=controller;
  setBusy(true);setError('');setInput('');reader.current?.stop();
  try{
   const reply=await askGuardian({save,message,history:messages.map(row=>({role:row.role,content:row.content})),expectedUser:uid,signal:controller.signal});
   if(ticket!==generation.current||controller.signal.aborted)return;
   setMessages(rows=>[...rows,{role:'user',content:message},{role:'assistant',content:reply.text,guardian:reply.guardian,source:reply.source,reason:reply.reason,unavailable:reply.unavailable}].slice(-6));
  }catch(e){if(ticket===generation.current&&!controller.signal.aborted){setError(e.message||'Le Gardien est indisponible.');setInput(message);}}
  finally{if(ticket===generation.current)setBusy(false);}
 }
 const intro=localGuardianReply(save,'bonjour');
 const visibleMessages=dialogueOwner.current===scope?messages:[],lastReply=visibleMessages.filter(row=>row.role==='assistant').at(-1)?.content||intro.text;
 return <section className="invisible-guardian" aria-labelledby="invisible-guardian-title">
  <div className="invisible-section-heading"><div><span className="invisible-eyebrow">Gardien de {episode.fragment.value} · {episode.city}</span><h2 id="invisible-guardian-title">Parler à {episode.guardian}</h2></div><span className="invisible-pill">Dialogue éphémère</span></div>
  <p className="invisible-muted" role="status">{!uid?'Mode narratif local.':!capability?'Vérification du service IA…':capability.reason==='disabled'?'Mode narratif actif : l’IA est désactivée sur ce service.':capability.reason==='provider_missing'?'Mode narratif actif : aucun fournisseur IA utilisable n’est configuré.':capability.aiConfigured?'Le fournisseur IA est configuré ; chaque réponse indique le mode réellement utilisé.':'Statut IA indisponible : le récit local reste accessible.'}</p>
  <p className="invisible-muted">Tes messages restent dans cette vue et s’effacent en la quittant. Pour une réponse IA, le message et jusqu’à trois échanges sont transmis au fournisseur, avec le contexte de jeu confirmé. Évite toute information personnelle.</p>
  <div className="invisible-conversation" role="log" aria-label={'Dialogue avec '+episode.guardian} aria-live="polite" aria-relevant="additions">
   {!visibleMessages.length&&<div className="invisible-dialogue guardian"><small>{episode.guardian} · récit local, sans IA</small><p>{intro.text}</p></div>}
   {visibleMessages.map((row,i)=><div key={i} className={'invisible-dialogue '+(row.role==='user'?'player':'guardian')}><small>{row.role==='user'?'Toi':row.guardian+(row.source==='ai'?' · réponse IA':' · mode narratif, sans IA')}</small><p>{row.content}</p>{row.unavailable&&<small>Le service IA est indisponible ; cette réponse utilise le récit local.</small>}</div>)}
  </div>
  <form className="invisible-chat-form" onSubmit={send}>
   <label htmlFor="invisible-guardian-message">Ton message <small>{input.length}/800</small></label>
   <textarea id="invisible-guardian-message" value={input} maxLength={800} rows={3} placeholder={episode.guardian+', peux-tu me donner un indice ?'} onChange={event=>setInput(event.target.value)} disabled={busy}/>
   <div className="invisible-chat-actions"><Button className="invisible-button primary" type="submit" disabled={busy||!input.trim()}>{busy?episode.guardian+' réfléchit…':'Envoyer'}</Button><Button variant="ghost" className="invisible-button" type="button" disabled={busy||!messages.length} onClick={()=>{reader.current?.stop();setMessages([]);setInput('');setError('');}}>Effacer ce dialogue</Button></div>
  </form>
  <div className="invisible-voice-controls"><Button variant="ghost" disabled={!voiceSupported||busy} onClick={()=>speaking?reader.current?.stop():reader.current?.read(lastReply)}>{speaking?'Arrêter la lecture':'Lire la réponse'}</Button><small>{voiceSupported?'Voix française locale de ton navigateur. Aucun micro, aucune voix clonée ; aucun envoi du texte pour cette lecture.':'Aucune voix française locale n’est disponible dans ce navigateur.'}</small></div>
  {error&&<p className="invisible-notice error" role="alert">{error}</p>}
  <p className="invisible-muted">Le dialogue ne valide pas les énigmes et ne donne aucune récompense. La mémoire facultative conserve uniquement les événements de l’aventure, jamais ces messages. Le service IA ne conserve pas d’historique dans 3B ; les règles de conservation du fournisseur s’appliquent.</p>
 </section>;
}
