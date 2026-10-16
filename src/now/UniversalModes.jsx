import {Button} from '../design-system/index.jsx';
import {useEffect,useState} from 'react';
import {Accessibility,Volume2,VolumeX,Type,Eye,ScanText,Wind} from 'lucide-react';
import {readUniversal,saveUniversal} from './universal.js';
const MODES=[
 {id:'largeText',title:'Texte plus grand',detail:'Une lecture plus confortable dans 3B',icon:Type},
 {id:'contrast',title:'Contraste renforcé',detail:'Des textes et boutons mieux distingués',icon:Eye},
 {id:'calm',title:'Animations apaisées',detail:'Moins de mouvement décoratif',icon:Wind},
 {id:'simple',title:'Lecture essentielle',detail:'Masquer quelques éléments purement décoratifs',icon:ScanText}
];
export default function UniversalModes(){
 const [prefs,setPrefs]=useState(()=>readUniversal(window.localStorage));
 const [voice,setVoice]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>()=>{window.speechSynthesis?.cancel?.()},[]);
 function toggle(id){
  const next=saveUniversal({...prefs,[id]:!prefs[id]},window.localStorage,document.documentElement);
  setPrefs(next);
 }
 function speak(){
  if(!window.speechSynthesis){setMessage('La lecture vocale dépend des fonctions de ton appareil.');return;}
  if(voice){window.speechSynthesis.cancel();setVoice(false);return;}
  const sentence='Bienvenue dans 3B International. Choisis une rubrique, prends ton temps et utilise seulement les fonctions qui te sont utiles.';
  const utterance=new SpeechSynthesisUtterance(sentence);utterance.lang='fr-FR';utterance.rate=.9;
  utterance.onend=()=>setVoice(false);utterance.onerror=()=>setVoice(false);
  window.speechSynthesis.speak(utterance);setVoice(true);
 }
 return <section className="now-feature" aria-labelledby="universal-title">
  <p className="now-eyebrow">06 / POUR TOUS</p><h2 id="universal-title">Une application qui s’adapte à toi.</h2>
  <p className="now-intro">Ces réglages modifient l’affichage de 3B sur cet appareil, sans créer de compte ni demander d’accès à tes données.</p>
  <div className="now-settings" role="group" aria-label="Préférences de lecture">
   {MODES.map(({id,title,detail,icon:Icon})=><Button variant="neutral" type="button" key={id} aria-pressed={prefs[id]} onClick={()=>toggle(id)}>
    <Icon size={21} strokeWidth={1.7} aria-hidden="true"/>
    <span><strong>{title}</strong><small>{detail}</small></span>
    <span className="now-switch" aria-hidden="true"/>
   </Button>)}
  </div>
  <div className="now-action-row">
   <Button variant="neutral" type="button" className="now-quiet" onClick={speak}>{voice?<VolumeX size={18}/>:<Volume2 size={18}/>} {voice?'Arrêter la lecture':'Écouter un exemple'}</Button>
   <Button variant="neutral" type="button" className="now-quiet" onClick={()=>{const settings=saveUniversal({},window.localStorage,document.documentElement);setPrefs(settings);setMessage('Affichage standard restauré.');}}><Accessibility size={18}/> Réglages d’origine</Button>
  </div>
  <p className="now-discretion">Les aides natives de ton téléphone (TalkBack, VoiceOver, grossissement et dictée) restent disponibles. L’effet réel dépend du navigateur. Ces choix sont locaux et réversibles.</p>
  {message&&<p className="now-message" role="status">{message}</p>}
 </section>;
}
