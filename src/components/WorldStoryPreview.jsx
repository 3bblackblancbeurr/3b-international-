import {useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {STORY_CANON} from '../world/story-canon.js';
import {REALM_PREVIEWS} from '../design-system/experience-policy.js';
import './world-story-preview.css';

const CHAPTERS=[
 {label:'La Rupture',title:STORY_CANON.circle.name,text:STORY_CANON.circle.purpose,detail:STORY_CANON.circle.rupture},
 {label:'Kaïs',title:'Un lien à retrouver.',text:STORY_CANON.hero.journey,detail:'Face à l’Oubli, chaque mémoire transmise compte. Ton voyage commence dans la Cité des Huit Héritages.'},
 {label:'Les héritages',title:'Huit valeurs. Un monde.',text:STORY_CANON.circle.eight},
];

export default function WorldStoryPreview({open,onClose,onExplore}){
 const dialog=useRef(null),content=useRef(null),titleId=useId();
 const [chapter,setChapter]=useState(0);
 const current=CHAPTERS[chapter];
 useEffect(()=>{content.current?.scrollTo(0,0);},[chapter,open]);
 useEffect(()=>{
  const element=dialog.current;
  if(!open){element?.close();return;}
  setChapter(0);
  if(!element.open)element.showModal();
  window.dispatchEvent(new CustomEvent('threeb:home-story-state',{detail:{open:true}}));
  return()=>{
   element.close();
   window.dispatchEvent(new CustomEvent('threeb:home-story-state',{detail:{open:false}}));
  };
 },[open]);

 return <dialog ref={dialog} className="world-story-dialog" aria-labelledby={titleId} onClose={onClose} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{
  if(event.target!==dialog.current)return;
  const rect=dialog.current.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();
 }}>
  <header className="world-story-heading"><span>LE MONDE DU 3B · LES ORIGINES</span><Button variant="ghost" autoFocus aria-label="Fermer l’histoire" onClick={onClose}><X size={22} aria-hidden="true"/></Button></header>
  <nav className="world-story-chapters" aria-label="Chapitres de l’histoire">
   {CHAPTERS.map((item,index)=><Button variant="ghost" key={item.label} aria-pressed={chapter===index} onClick={()=>setChapter(index)}><span aria-hidden="true">0{index+1}</span>{item.label}</Button>)}
  </nav>
  <article ref={content} className="world-story-content" tabIndex={0} aria-label="Récit du chapitre">
   <p className="world-story-number" aria-live="polite">Chapitre {chapter+1} sur {CHAPTERS.length} · {current.label}</p>
   <h2 id={titleId}>{current.title}</h2>
   <p className="world-story-lead">{current.text}</p>
   {current.detail&&<p>{current.detail}</p>}
   {chapter===2&&<ul className="world-story-realms">{REALM_PREVIEWS.map(realm=><li key={realm.code}><span>{realm.name}</span><strong>{realm.value}</strong><small>{realm.guardian}</small></li>)}</ul>}
  </article>
  <footer className="world-story-actions"><Button variant="ghost" disabled={chapter===0} onClick={()=>setChapter(value=>value-1)}><ArrowLeft size={18} aria-hidden="true"/>Précédent</Button>{chapter<CHAPTERS.length-1?<Button onClick={()=>setChapter(value=>value+1)}>Continuer<ArrowRight size={18} aria-hidden="true"/></Button>:<Button onClick={onExplore}>Explorer le Monde<ArrowRight size={18} aria-hidden="true"/></Button>}</footer>
 </dialog>;
}
