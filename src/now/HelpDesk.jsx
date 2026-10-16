import {Button} from '../design-system/index.jsx';
import {useState} from 'react';
import {ArrowRight,HeartHandshake,ShieldCheck} from 'lucide-react';

export default function HelpDesk({goTo}){
 const [kind,setKind]=useState('offer'),[title,setTitle]=useState(''),[body,setBody]=useState(''),[message,setMessage]=useState('');
 function continueCommunity(event){
  event.preventDefault();
  const heading=title.trim(),description=body.trim();
  if(heading.length<3||description.length<10){setMessage('Ajoute un titre et quelques mots pour que ta proposition soit compréhensible.');return;}
  try{
   sessionStorage.setItem('3b-help-draft',JSON.stringify({title:(kind==='need'?'Besoin d’un coup de main : ':'Je peux aider : ')+heading.slice(0,90),body:description.slice(0,1400)}));
   sessionStorage.setItem('3b-community-intent','collaboration');
  }catch{setMessage('Le brouillon ne peut pas être transmis sur cet appareil. Recopie ton texte dans la Communauté.');return;}
  goTo('community');
 }
 return <section className="now-feature" aria-labelledby="help-title">
  <p className="now-eyebrow">03 / ENSEMBLE</p><h2 id="help-title">Le Coup de Main 3B.</h2>
  <p className="now-intro">Une compétence, un conseil, un projet collectif : commence par une proposition simple. La publication reste volontaire et soumise aux règles de la Communauté.</p>
  <div className="now-help-choice" role="group" aria-label="Type de proposition">
   <Button type="button" aria-pressed={kind==='offer'} onClick={()=>setKind('offer')}><HeartHandshake size={20}/> Je propose mon aide</Button>
   <Button type="button" aria-pressed={kind==='need'} onClick={()=>setKind('need')}><ShieldCheck size={20}/> J’ai besoin d’un conseil</Button>
  </div>
  <form className="now-help-form" onSubmit={continueCommunity}>
   <label className="now-field">En quelques mots
    <input maxLength={90} value={title} onChange={e=>setTitle(e.target.value)} required minLength={3} placeholder={kind==='offer'?'Ex. Je peux expliquer les bases du numérique':'Ex. Je cherche des conseils pour mon CV'}/>
   </label>
   <label className="now-field">Ce que tu proposes ou recherches
    <textarea rows={4} maxLength={1400} required minLength={10} value={body} onChange={e=>setBody(e.target.value)} placeholder="Explique ton idée, sans coordonnées personnelles ni adresse précise."/>
   </label>
   <Button type="submit" className="now-primary">Préparer dans la Communauté <ArrowRight size={18}/></Button>
  </form>
  <p className="now-discretion">Aucune mise en relation automatique, aucun partage public à cette étape. Les échanges se font dans la Communauté avec compte, consentement, signalement et modération. Ne publie ni numéro, ni adresse privée, ni donnée sensible.</p>
  {message&&<p className="now-message" role="status">{message}</p>}
 </section>;
}
