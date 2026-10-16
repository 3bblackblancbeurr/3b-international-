import {Button} from '../design-system/index.jsx';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,AudioLines,BookOpen,Compass,Gamepad2,Globe2,HeartPulse,Home,Mic,MicOff,Plane,Send,ShieldCheck,ShoppingBag,Sparkles,UserRound,Volume2,VolumeX} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {albertLocalGuideAnswer} from './world-living-data.js';
import '../styles/world-living-home.css';

const SUGGESTIONS=[
 {label:'Trouver un voyage',query:'voyage',Icon:Plane},
 {label:'Bien-être et recettes',query:'sante',Icon:HeartPulse},
 {label:'Gaming 16-18',query:'gaming',Icon:Gamepad2},
 {label:'Explorer les royaumes',query:'monde du 3b',Icon:Compass},
];
const JOURNEY=[
 {step:'01',title:'Découvrir',hint:'Informations et opportunités',page:'news',Icon:BookOpen},
 {step:'02',title:'Prendre soin de soi',hint:'Santé et recettes',page:'health',Icon:HeartPulse},
 {step:'03',title:'Partager',hint:'L’espace Communauté',page:'community',Icon:Sparkles},
];

function AlbertAvatar(){
 return <div className="albert3b-avatar" aria-hidden="true">
  <div className="albert3b-avatar-halo"/>
  <svg viewBox="0 0 230 260" role="presentation">
   <defs>
    <linearGradient id="albert3bFace" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--3b-world-tone-5cb9e8)"/><stop offset=".43" stopColor="var(--3b-world-tone-13345f)"/><stop offset="1" stopColor="var(--3b-world-tone-020b19)"/></linearGradient>
    <linearGradient id="albert3bGlow" x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--3b-world-tone-7ed7fa)"/><stop offset="1" stopColor="var(--3b-world-tone-ddba7f)"/></linearGradient>
   </defs>
   <path d="M0 255 C16 211 55 194 76 187 L80 155 L150 155 L154 187 C186 192 218 219 230 255Z" fill="var(--3b-world-tone-061427)" stroke="var(--3b-world-tone-327cba)" strokeWidth="2"/>
   <path d="M50 255 C62 206 77 198 94 191 L117 214 L139 192 C163 197 180 214 186 255" fill="none" stroke="var(--3b-world-tone-67d5ff)" strokeOpacity=".72" strokeWidth="3"/>
   <path d="M69 83 C71 48 94 26 119 26 C154 26 173 54 170 99 L164 157 C153 184 138 194 116 195 C96 194 76 179 69 156Z" fill="url(#albert3bFace)" stroke="var(--3b-world-tone-78bfee)" strokeWidth="2"/>
   <path d="M66 98 C59 34 91 8 126 13 C169 14 181 50 173 101 C166 79 153 64 139 57 C114 85 95 89 66 98Z" fill="var(--3b-world-tone-04182e)" stroke="url(#albert3bGlow)" strokeWidth="2"/>
   <path d="M81 115 Q98 107 109 114 M126 114 Q142 106 155 115" fill="none" stroke="var(--3b-world-tone-b1edff)" strokeWidth="3" strokeLinecap="round"/>
   <path d="M113 119 Q108 140 115 145 M101 161 Q117 171 133 161" fill="none" stroke="var(--3b-world-tone-73aee5)" strokeWidth="2"/>
   <path d="M73 99 L49 93 L49 126 L75 131 M166 99 L185 94 L185 126 L163 134" stroke="var(--3b-world-tone-6de1ff)" strokeWidth="3" fill="none"/>
   <path d="M55 125 L66 154 L87 174 M179 125 L170 154 L149 174" stroke="var(--3b-world-tone-bc8c56)" strokeWidth="2" fill="none"/>
   <circle cx="49" cy="125" r="5" fill="var(--3b-world-tone-cdeefd)"/><circle cx="184" cy="125" r="5" fill="var(--3b-world-tone-cdeefd)"/>
   <path d="M78 182 C93 201 106 205 117 212 C129 205 144 199 155 182" fill="none" stroke="url(#albert3bGlow)" strokeWidth="3"/>
  </svg>
  <span className="albert3b-orbit albert3b-orbit-one"/><span className="albert3b-orbit albert3b-orbit-two"/>
 </div>;
}

export default function AlbertPublicPreview({goTo}){
 const [draft,setDraft]=useState('');
 const [messages,setMessages]=useState([]);
 const [listening,setListening]=useState(false);
 const [notice,setNotice]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const recognition=useRef(null),chatEnd=useRef(null);
 useEffect(()=>()=>{try{recognition.current?.abort();window.speechSynthesis?.cancel();}catch{/* cleanup */}},[]);
 useEffect(()=>{chatEnd.current?.scrollIntoView?.({block:'nearest',behavior:'smooth'});},[messages.length]);
 function ask(value){
  const text=String(value??draft).trim().slice(0,300);
  if(!text)return;
  const answer=albertLocalGuideAnswer(text);
  setMessages(history=>[...history,{question:text,...answer}].slice(-12));
  setDraft('');setNotice('');
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
  try{rec.start();setListening(true);setNotice('La dictée reste sur ton initiative. Appuie sur Envoyer pour transmettre la question au guide local.');}
  catch{setListening(false);setNotice('Impossible de démarrer la dictée.');}
 }
 function speak(message){
  if(!window.speechSynthesis)return;
  if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
  const utterance=new SpeechSynthesisUtterance(String(message).slice(0,400));
  utterance.lang='fr-FR';utterance.rate=.94;
  utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);
  try{window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);}
  catch{setSpeaking(false);}
 }
 return <section className="albert3b-experience" aria-label="Albert APEX 3B — assistant d'orientation">
  <div className="albert3b-topbar"><RouteLink goTo={goTo} page="home" className="albert3b-back"><ArrowLeft size={18}/> Retour au Monde 3B</RouteLink><span className="albert3b-topmark">3B <em>INTERNATIONAL</em></span></div>
  <header className="albert3b-stage">
   <div className="albert3b-stage-copy">
    <p className="world3b-eyebrow">3B INTERNATIONAL · INTELLIGENCE</p>
    <h1>Albert <span>APEX</span></h1>
    <p className="albert3b-tagline">Votre univers, vos possibilités, un seul guide.</p>
    <div className="albert3b-status"><ShieldCheck size={17}/> Mode guide local · Albert personnel non connecté</div>
   </div>
   <AlbertAvatar/>
  </header>
  <div className="albert3b-content">
   <section className="albert3b-chat" aria-label="Dialogue avec le guide 3B">
    <div className="albert3b-section-head"><div><span className="world3b-eyebrow">VOTRE ASSISTANT</span><h2>Comment puis-je t’aider ?</h2></div><Sparkles size={23} aria-hidden="true"/></div>
    <div className="albert3b-conversation" aria-live="polite">
     <div className="albert3b-reply"><strong>Bienvenue dans 3B.</strong><p>Dis-moi ce que tu recherches. Je te conduirai vers le bon univers 3B.</p></div>
     {messages.map((item,i)=><div className="albert3b-turn" key={i}>
      <p className="albert3b-question">{item.question}</p>
      <div className="albert3b-reply"><p>{item.message}</p>
       {item.destination&&<RouteLink page={item.destination.id} goTo={goTo} className="albert3b-reply-link">Ouvrir {item.destination.label}<ArrowRight size={16}/></RouteLink>}
       <Button variant="ghost" type="button" className="albert3b-speak" aria-label="Écouter cette réponse" onClick={()=>speak(item.message)}>{speaking?<VolumeX size={15}/>:<Volume2 size={15}/>} Écouter</Button>
      </div>
     </div>)}
     <span ref={chatEnd}/>
    </div>
    <form className="albert3b-form" onSubmit={event=>{event.preventDefault();ask();}}>
     <label htmlFor="albert3b-input" className="visually-hidden">Ta question pour le guide 3B</label>
     <input id="albert3b-input" value={draft} onChange={e=>setDraft(e.target.value.slice(0,300))} maxLength={300} placeholder="Demander, découvrir, explorer…" autoComplete="off"/>
     <Button variant="ghost" type="button" className="albert3b-mic" aria-label={listening?'Arrêter la dictée':'Dicter une question'} aria-pressed={listening} onClick={startDictation}>{listening?<MicOff size={21}/>:<Mic size={21}/>}</Button>
     <Button variant="ghost" type="submit" className="albert3b-submit" aria-label="Envoyer ma question" disabled={!draft.trim()}><Send size={20}/></Button>
    </form>
    {notice&&<p className="albert3b-notice" role="status">{notice}</p>}
    <p className="albert3b-disclaimer">Ce guide oriente dans les rubriques existantes. Il n’envoie aucune demande à Albert sur ton ordinateur et ne conserve pas tes messages sur un serveur.</p>
   </section>
   <section className="albert3b-curated" aria-labelledby="albert3b-suggest-title">
    <div className="albert3b-section-head"><div><span className="world3b-eyebrow">DÉCOUVRIR</span><h2 id="albert3b-suggest-title">Recommandé pour explorer</h2></div></div>
    <div className="albert3b-suggestions">
     {SUGGESTIONS.map(({label,query,Icon})=><Button variant="ghost" type="button" key={query} onClick={()=>ask(query)}><Icon size={25}/><span>{label}</span><ArrowRight size={16}/></Button>)}
    </div>
    <div className="albert3b-section-head albert3b-timeline-head"><div><span className="world3b-eyebrow">PARCOURS LIBRE</span><h2>Votre parcours vivant</h2></div></div>
    <ol className="albert3b-timeline">
     {JOURNEY.map(({step,title,hint,page,Icon})=><li key={step}><span className="albert3b-step">{step}</span><Icon size={20}/><RouteLink goTo={goTo} page={page}><strong>{title}</strong><small>{hint}</small></RouteLink><ArrowRight size={16}/></li>)}
    </ol>
    <div className="albert3b-actual-ai"><AudioLines size={25}/><div><strong>Besoin d’une conversation IA ?</strong><p>Le Mode 3 IA est un espace existant, distinct d’Albert APEX.</p></div><RouteLink goTo={goTo} page="ia-trio">Mode 3 IA <ArrowRight size={16}/></RouteLink></div>
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
