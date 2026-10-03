import {useEffect,useState} from 'react';
import {MessageCircle,Newspaper,Volume2,VolumeX,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {cityAdvisorBulletin,CITY_ADVISORS} from './city3b-advisors.js';
import './city3b-advisor.css';

export default function City3BAdvisor({campaign,cityId,compact,onMission,onJournal}){
 const bulletin=cityAdvisorBulletin(campaign);
 const [dismissed,setDismissed]=useState(''),[journal,setJournal]=useState(false),[voice,setVoice]=useState(false);
 useEffect(()=>{setDismissed('');setJournal(false);setVoice(false);},[cityId]);
 useEffect(()=>()=>{if(voice)globalThis.speechSynthesis?.cancel();},[voice,cityId]);
 useEffect(()=>{if(compact)setJournal(false);},[compact]);
 if(!bulletin)return null;
 const collapsed=compact||dismissed===bulletin.id;
 const speak=()=>{
  if(voice){globalThis.speechSynthesis?.cancel();setVoice(false);return;}
  if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return;
  const utterance=new SpeechSynthesisUtterance(`${bulletin.advisor.name}. ${bulletin.title}. ${bulletin.text}`);
  utterance.lang='fr-FR';utterance.onend=()=>setVoice(false);utterance.onerror=()=>setVoice(false);
  setVoice(true);globalThis.speechSynthesis.cancel();globalThis.speechSynthesis.speak(utterance);
 };
 return <aside className="city3b-advisor" data-compact={collapsed} aria-label="Conseil au maire">
  {collapsed?<Button variant="ghost" className="city3b-advisor-chip" aria-label="Ouvrir le conseil au maire" onClick={()=>{if(compact)onJournal();else setDismissed('');}}><MessageCircle size={18}/><span>Conseil</span></Button>:<>
   <div className="city3b-advisor-top"><span className="city3b-advisor-avatar" style={{background:bulletin.advisor.color}} aria-hidden="true">{bulletin.advisor.initial}</span><div><strong>{bulletin.advisor.name}</strong><small>{bulletin.advisor.role}</small></div><Button variant="ghost" aria-label="Réduire le conseil" onClick={()=>setDismissed(bulletin.id)}><X size={16}/></Button></div>
   <strong className="city3b-advisor-title">{bulletin.title}</strong><p>{bulletin.text}</p>
   <div className="city3b-advisor-actions"><Button variant="champagne" onClick={onMission}>{bulletin.ready?'Recevoir la récompense':'Voir les objectifs'} · {bulletin.progress}</Button><Button variant="ghost" aria-label="Journal de la ville" aria-expanded={journal} onClick={()=>setJournal(!journal)}><Newspaper size={17}/></Button>{globalThis.speechSynthesis&&<Button variant="ghost" aria-label={voice?'Arrêter la lecture':'Écouter le conseil'} aria-pressed={voice} onClick={speak}>{voice?<VolumeX size={17}/>:<Volume2 size={17}/>}</Button>}</div>
   {journal&&<div className="city3b-advisor-journal"><strong>{CITY_ADVISORS.Jade.name} · 3B Actualités</strong><p>Maire, {bulletin.progress} missions principales ont été accomplies. Les habitants suivent les transformations de votre ville.</p><p>Les demandes facultatives et la boutique Premium laissent toute la campagne principale accessible.</p><Button variant="ghost" onClick={onJournal}>Les demandes des habitants →</Button></div>}
  </>}
 </aside>;
}
