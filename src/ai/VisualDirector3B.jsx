import {useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Copy,Download,Images,Layers3,ShieldCheck,Sparkles} from 'lucide-react';
import {VISUAL_FAMILIES,VISUAL_RATIOS,VISUAL_COUNTS,makeVisualBrief} from './visual-director-catalog.js';
import './visual-director.css';

export default function VisualDirector3B({onClose}){
 const [family,setFamily]=useState('world');
 const [preset,setPreset]=useState(VISUAL_FAMILIES[0].presets[0][0]);
 const [subject,setSubject]=useState('');
 const [ratio,setRatio]=useState('mobile');
 const [notes,setNotes]=useState('');
 const [notice,setNotice]=useState('');
 const briefRef=useRef(null);
 const category=VISUAL_FAMILIES.find(f=>f.id===family)||VISUAL_FAMILIES[0];
 const selected=category.presets.find(p=>p[0]===preset)||category.presets[0];
 const brief=useMemo(()=>makeVisualBrief({family,preset,subject,ratio,notes}),[family,preset,subject,ratio,notes]);
 function changeCategory(id){
  const next=VISUAL_FAMILIES.find(f=>f.id===id);if(!next)return;
  setFamily(id);setPreset(next.presets[0][0]);setNotice('');
 }
 async function copyBrief(){
  try{
   if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
   await navigator.clipboard.writeText(brief);
   setNotice('Brief copié. Tu peux le coller dans ton outil de création.');
  }catch{
   briefRef.current?.focus();briefRef.current?.select();
   setNotice('Sélectionne le brief et utilise Copier sur ton téléphone ou clavier.');
  }
 }
 function downloadBrief(){
  const url=URL.createObjectURL(new Blob([brief],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='3b-studio-visuel-brief.txt';
  a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1200);setNotice('Brief exporté sur cet appareil.');
 }
 return <section className="vd3b" aria-label="Studio Visuel 3B — bibliothèque créative">
  <div className="vd3b-atmosphere" data-family={family} aria-hidden="true"/>
  <header className="vd3b-header">
   <button type="button" className="vd3b-back" onClick={onClose}><ArrowLeft size={18}/> Espace IA</button>
   <span>3B INTERNATIONAL · LABORATOIRE CRÉATIF</span>
  </header>
  <div className="vd3b-hero">
   <span className="vd3b-kicker"><Sparkles size={15}/> CONCEPTS 13 + 14 · CRÉER SANS LIMITES VISUELLES</span>
   <h1>Le Studio <em>Visuel.</em></h1>
   <p>Une idée. Une direction artistique. Un brief précis, prêt à utiliser pour créer les futurs visuels 3B.</p>
   <span className="vd3b-count"><Images size={16}/>{VISUAL_COUNTS} directions · {VISUAL_FAMILIES.length} univers créatifs</span>
  </div>
  <div className="vd3b-workspace">
   <div className="vd3b-workspace-head"><div><span>01 / CHOISIS TON UNIVERS</span><h2>À quoi donner vie ?</h2></div><Layers3 size={24}/></div>
   <nav className="vd3b-families" aria-label="Familles de visuels">
    {VISUAL_FAMILIES.map(f=><button key={f.id} type="button" aria-pressed={family===f.id} onClick={()=>changeCategory(f.id)}>{f.label}</button>)}
   </nav>
   <div className="vd3b-workspace-head vd3b-workspace-head--sub"><div><span>02 / CHOISIS UN TYPE DE SCÈNE</span><h3>{category.label}</h3></div><span className="vd3b-workspace-count">{category.presets.length} styles</span></div>
   <div className="vd3b-scenes" role="group" aria-label="Types de rendus">
    {category.presets.map((item,index)=><button key={item[0]} type="button" aria-pressed={preset===item[0]} onClick={()=>{setPreset(item[0]);setNotice('');}}>
     <span>{String(index+1).padStart(2,'0')}</span><strong>{item[1]}</strong><ArrowRight size={16}/>
    </button>)}
   </div>
   <div className="vd3b-scene-selection"><span>TA SCÈNE</span><strong>{selected[1]}</strong><p>{selected[2]}</p></div>
   <div className="vd3b-fields">
    <label><span>Ton sujet ou ton projet</span><input value={subject} onChange={e=>setSubject(e.target.value.slice(0,250))} maxLength={250} placeholder="Ex. : royaume France, sneakers 3B, affiche esport…"/></label>
    <fieldset><legend>Format de destination</legend><div className="vd3b-formats">{VISUAL_RATIOS.map(f=><button key={f.id} type="button" aria-pressed={ratio===f.id} onClick={()=>setRatio(f.id)}>{f.label}</button>)}</div></fieldset>
    <label><span>Détails particuliers (facultatif)</span><textarea rows={3} maxLength={480} value={notes} onChange={e=>setNotes(e.target.value.slice(0,480))} placeholder="Palette, saison, tenue, âge du personnage fictif, atmosphère, contexte…"/></label>
   </div>
   <div className="vd3b-brief">
    <div><span>03 / TON BRIEF PERSONNALISÉ</span><strong>Prêt à créer</strong></div>
    <textarea ref={briefRef} readOnly value={brief} rows={11} aria-label="Brief créatif 3B à copier"/>
    <div className="vd3b-actions">
     <button type="button" className="vd3b-primary" onClick={copyBrief}><Copy size={17}/> Copier le brief</button>
     <button type="button" className="vd3b-secondary" onClick={downloadBrief}><Download size={17}/> Exporter .txt</button>
    </div>
    {notice&&<p className="vd3b-notice" role="status"><Check size={14}/>{notice}</p>}
   </div>
  </div>
  <footer className="vd3b-footer"><ShieldCheck size={17}/><p>Bibliothèque de directions artistiques et modèles de briefs. Elle n’effectue aucune génération payante, ne lit pas les données privées et ne prétend pas que les noms de styles sont des commandes intégrées.</p></footer>
 </section>;
}
