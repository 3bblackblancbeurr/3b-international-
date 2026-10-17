import {Button} from '../design-system/index.jsx';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,AudioLines,BookOpen,CalendarDays,Compass,Gamepad2,Globe2,HeartPulse,Home,Mic,MicOff,Plane,Send,ShieldCheck,ShoppingBag,Sparkles,UserRound,Volume2,VolumeX,MessageCircle,X} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import AlbertDailyTimeline from './AlbertDailyTimeline.jsx';
import AlbertHologramAvatar from './AlbertHologramAvatar.jsx';
import {albertLocalGuideAnswer} from './world-living-data.js';
import {readAlbertFavoriteModules,WORLD_FAVORITES_KEY} from './albert-favorite-routes.js';
import '../styles/world-living-home.css';
import '../styles/immersive-albert-v2.css';

const SUGGESTIONS=[
 {label:'Trouver un voyage',query:'voyage',Icon:Plane},
 {label:'Bien-être et recettes',query:'sante',Icon:HeartPulse},
 {label:'Gaming 16-18',query:'gaming',Icon:Gamepad2},
 {label:'Explorer les royaumes',query:'monde du 3b',Icon:Compass},
];


export default function AlbertPublicPreview({goTo}){
 const [draft,setDraft]=useState('');
 const [messages,setMessages]=useState([]);
 const [listening,setListening]=useState(false);
 const [notice,setNotice]=useState('');
 const [speakingIndex,setSpeakingIndex]=useState(-1);
 const [panel,setPanel]=useState('talk');
 const [favoriteRoutes,setFavoriteRoutes]=useState(()=>readAlbertFavoriteModules(typeof window!=='undefined'?window.localStorage:null));
 const recognition=useRef(null),conversationRef=useRef(null),activeSpeech=useRef(null);
 useEffect(()=>()=>{try{recognition.current?.abort();activeSpeech.current=null;window.speechSynthesis?.cancel();}catch{/* cleanup */}},[]);
 useEffect(()=>{
  const panel=conversationRef.current;
  if(!panel||!messages.length)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||document.documentElement.dataset.experienceMotion==='reduced';
  panel.scrollTo({top:panel.scrollHeight,behavior:reduced?'auto':'smooth'});
 },[messages]);
 useEffect(()=>{
  const refresh=()=>setFavoriteRoutes(readAlbertFavoriteModules(typeof window!=='undefined'?window.localStorage:null));
  const onStorage=event=>{if(event.key===WORLD_FAVORITES_KEY||event.key===null)refresh();};
  window.addEventListener('focus',refresh);
  window.addEventListener('storage',onStorage);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',onStorage);};
 },[]);
 function ask(value){
  const text=String(value??draft).trim().slice(0,300);
  if(!text)return;
  // A new answer invalidates the old audio, even after the 12-turn cap.
  activeSpeech.current=null;window.speechSynthesis?.cancel();setSpeakingIndex(-1);
  const answer=albertLocalGuideAnswer(text);
  setMessages(history=>[...history,{question:text,...answer}].slice(-12));
  setDraft('');setNotice('');setPanel('talk');
 }
 function startDictation(){
  if(listening){recognition.current?.stop();return;}
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){setNotice('Dictée indisponible sur ce téléphone. Utilise le clavier.');return;}
  const rec=new SpeechRecognition();
  rec.lang='fr-FR';rec.continuous=false;rec.interimResults=false;
  rec.onresult=event=>{const text=Array.from(event.results).map(x=>x[0]?.transcript||'').join(' ');setDraft(value=>(value+' '+text).trim().slice(0,300));};
  rec.onerror=()=>{setListening(false);setNotice('Microphone indisponible ou non autorisé.');};
  rec.onend=()=>setListening(false);
  recognition.current=rec;
  try{rec.start();setListening(true);setNotice('La dictée est facultative. Selon ton navigateur, ta voix peut être traitée par son fournisseur. Pour éviter cela, utilise le clavier. Appuie sur Envoyer pour interroger le guide 3B.');}
  catch{setListening(false);setNotice('Impossible de démarrer la dictée.');}
 }
 function speak(message,index){
  const engine=window.speechSynthesis;
  if(!engine){setNotice('La lecture vocale est indisponible sur ce navigateur.');return;}
  if(activeSpeech.current?.index===index){
   activeSpeech.current=null;engine.cancel();setSpeakingIndex(-1);return;
  }
  try{
   engine.cancel();
   const utterance=new SpeechSynthesisUtterance(String(message).slice(0,400));
   utterance.lang='fr-FR';utterance.rate=.94;
   activeSpeech.current={index,utterance};
   const finish=()=>{if(activeSpeech.current?.utterance===utterance){activeSpeech.current=null;setSpeakingIndex(-1);}};
   utterance.onend=finish;utterance.onerror=finish;
   engine.speak(utterance);setSpeakingIndex(index);setNotice('');
  }catch{activeSpeech.current=null;setSpeakingIndex(-1);setNotice('La lecture vocale ne peut pas démarrer.');}
 }
 return <section className="albert3b-experience th-albert-screen" data-panel={panel} data-has-messages={messages.length?'true':'false'} aria-label="Albert APEX 3B — assistant d'orientation">
  <div className="albert3b-topbar"><RouteLink goTo={goTo} page="home" className="albert3b-back"><ArrowLeft size={18}/> Retour au Monde 3B</RouteLink><span className="albert3b-topmark">3B <em>INTERNATIONAL</em></span></div>
  <header className="albert3b-stage">
   <div className="albert3b-stage-copy">
    <p className="world3b-eyebrow">3B INTERNATIONAL · INTELLIGENCE</p>
    <h1>Albert <span>APEX</span></h1>
    <p className="albert3b-tagline">Votre univers, vos possibilités, un seul guide.</p>
    <div className="albert3b-status"><ShieldCheck size={17}/> Mode guide local · Albert personnel non connecté</div>
   </div>
   <AlbertHologramAvatar/>
   <span className="th-albert-stage-constellation" aria-hidden="true">3B · APEX / VISUAL PRESENCE</span>
  </header>
  <nav className="th-albert-toolbar" aria-label="Outils Albert APEX">
   <button type="button" aria-pressed={panel==='talk'} onClick={()=>setPanel('talk')}><MessageCircle size={18}/> Dialoguer</button>
   <button type="button" aria-pressed={panel==='discover'} onClick={()=>setPanel('discover')}><Compass size={18}/> Explorer</button>
   <button type="button" aria-pressed={panel==='day'} onClick={()=>setPanel('day')}><CalendarDays size={18}/> Ma journée</button>
  </nav>
  <div className="albert3b-content">
   <section className="albert3b-chat" hidden={panel!=='talk'} aria-label="Dialogue avec le guide 3B">
    <div className="albert3b-section-head"><div><span className="world3b-eyebrow">VOTRE ASSISTANT</span><h2>Comment puis-je t’aider ?</h2></div><Sparkles size={23} aria-hidden="true"/></div>
    <div className="albert3b-conversation" ref={conversationRef} aria-live="polite">
     <div className="albert3b-reply"><strong>Bienvenue dans 3B.</strong><p>Dis-moi ce que tu recherches. Je te conduirai vers le bon univers 3B.</p></div>
     {messages.map((item,i)=><div className="albert3b-turn" key={i}>
      <p className="albert3b-question">{item.question}</p>
      <div className="albert3b-reply"><p>{item.message}</p>
       {item.destination&&<RouteLink page={item.destination.id} goTo={goTo} className="albert3b-reply-link">Ouvrir {item.destination.label}<ArrowRight size={16}/></RouteLink>}
       <Button variant="ghost" type="button" className="albert3b-speak" aria-label={speakingIndex===i?"Arrêter la lecture de cette réponse":"Écouter cette réponse"} onClick={()=>speak(item.message,i)}>{speakingIndex===i?<VolumeX size={15}/>:<Volume2 size={15}/>} {speakingIndex===i?"Arrêter":"Écouter"}</Button>
      </div>
     </div>)}

    </div>
    <form className="albert3b-form" onSubmit={event=>{event.preventDefault();ask();}}>
     <label htmlFor="albert3b-input" className="visually-hidden">Ta question pour le guide 3B</label>
     <input id="albert3b-input" value={draft} onChange={e=>setDraft(e.target.value.slice(0,300))} maxLength={300} placeholder="Demander, découvrir, explorer…" autoComplete="off"/>
     <Button variant="ghost" type="button" className="albert3b-mic" aria-label={listening?'Arrêter la dictée':'Dicter une question'} aria-pressed={listening} onClick={startDictation}>{listening?<MicOff size={21}/>:<Mic size={21}/>}</Button>
     <Button variant="ghost" type="submit" className="albert3b-submit" aria-label="Envoyer ma question" disabled={!draft.trim()}><Send size={20}/></Button>
    </form>
    {notice&&<p className="albert3b-notice" role="status">{notice}</p>}
    <details className="th-albert-privacy"><summary><ShieldCheck size={13}/> Confidentialité</summary><p className="albert3b-disclaimer">Ce guide oriente dans les rubriques existantes. Il n’envoie aucune demande à Albert sur ton ordinateur et ne conserve pas tes messages sur un serveur 3B. La reconnaissance vocale peut utiliser un service du navigateur : le clavier reste toujours disponible.</p></details>
   </section>
   <section className="albert3b-curated" hidden={panel!=='discover'} aria-labelledby="albert3b-suggest-title">
    <div className="albert3b-section-head"><div><span className="world3b-eyebrow">DÉCOUVRIR</span><h2 id="albert3b-suggest-title">Recommandé pour explorer</h2></div></div>
    <div className="albert3b-suggestions">
     {SUGGESTIONS.map(({label,query,Icon})=><Button variant="ghost" type="button" key={query} onClick={()=>ask(query)}><Icon size={25}/><span>{label}</span><ArrowRight size={16}/></Button>)}
    </div>
     {favoriteRoutes.length>0&&<section className="albert3b-local-favorites" aria-labelledby="albert3b-favorites-title">
      <div><span className="world3b-eyebrow">VOS CHOIX SUR CET APPAREIL</span><h3 id="albert3b-favorites-title">Mes raccourcis préférés</h3></div>
      <div className="albert3b-local-favorite-links">
       {favoriteRoutes.map(item=><RouteLink goTo={goTo} page={item.id} key={item.id}>{item.label}<ArrowRight size={15} aria-hidden="true"/></RouteLink>)}
      </div>
      <p>Ces accès viennent uniquement de tes favoris dans la Carte du Monde 3B. Albert ne lit pas ton Passeport ou tes données Santé.</p>
     </section>}
    <div className="albert3b-actual-ai"><AudioLines size={25}/><div><strong>Besoin d’une conversation IA ?</strong><p>Le Mode 3 IA est un espace existant, distinct d’Albert APEX.</p></div><RouteLink goTo={goTo} page="ia-trio">Mode 3 IA <ArrowRight size={16}/></RouteLink></div>
   </section>
   <section className="th-albert-agenda" hidden={panel!=='day'} aria-label="Organiser ma journée">
    <button type="button" className="th-albert-sheet-close" onClick={()=>setPanel('talk')} aria-label="Fermer le planning"><X size={20}/></button>
    <AlbertDailyTimeline goTo={goTo}/>
   </section>
  </div>
  <nav className="albert3b-local-dock" aria-label="Navigation de l'espace Albert">
   <RouteLink page="home" goTo={goTo}><Home size={21}/><span>Accueil</span></RouteLink>
   <RouteLink page="world3b" goTo={goTo}><Globe2 size={21}/><span>Monde 3B</span></RouteLink>
   <RouteLink page="ia-trio" goTo={goTo}><Sparkles size={22}/><span>IA 3B</span></RouteLink>
   <RouteLink page="shop" goTo={goTo}><ShoppingBag size={21}/><span>Boutique</span></RouteLink>
   <RouteLink page="member" goTo={goTo}><UserRound size={21}/><span>Mon compte</span></RouteLink>
  </nav>
 </section>;
}
