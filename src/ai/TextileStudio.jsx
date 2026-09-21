import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowLeft,ArrowRight,Check,CheckCircle2,Cloud,Download,FolderOpen,Layers3,
 Palette,RotateCcw,Save,Shirt,Sparkles,Trash2,Type,Workflow
} from 'lucide-react';
import {
 DEFAULT_DESIGN,JERSEY_SPORTS,JERSEY_SLEEVES,JERSEY_COLLARS,JERSEY_CONSTRUCTIONS,
 JERSEY_HEMS,JERSEY_PRINT_METHODS,JERSEY_SIZES,JERSEY_LOGO_PLACEMENTS,
 JERSEY_NUMBER_STYLES,JERSEY_PRESETS,MATERIAL_GROUPS,PATTERNS,TECHNIQUES,
 designReadiness,textilePrompt,validateDesign
} from '../../shared/studio.js';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {ecosystem} from '../lib/ecosystem.js';
import DesignPreview from './DesignPreview.jsx';

const STEPS=[
 {id:'base',label:'Base',icon:Shirt,help:'Sport et direction'},
 {id:'construction',label:'Construction',icon:Workflow,help:'Coupe et patronage'},
 {id:'graphics',label:'Design',icon:Palette,help:'Couleurs et graphisme'},
 {id:'identity',label:'Identité',icon:Type,help:'Nom, numéro, marquages'},
 {id:'production',label:'Production',icon:Layers3,help:'Matière et brief'}
];

function readDraft(){
 try{
  const saved=JSON.parse(localStorage.getItem('3b-studio-config')||'null');
  return saved?{design:validateDesign(saved.design||saved),idea:typeof saved.idea==='string'?saved.idea.slice(0,2000):'',title:typeof saved.title==='string'?saved.title.slice(0,100):'Mon maillot 3B'}:{design:DEFAULT_DESIGN,idea:'',title:'Mon maillot 3B'};
 }catch{return{design:DEFAULT_DESIGN,idea:'',title:'Mon maillot 3B'};}
}

const OptionGrid=({items,value,onChange,className=''})=><div className={'jersey-option-grid '+className}>{items.map(item=><button type="button" key={item} className={value===item?'active':''} aria-pressed={value===item} onClick={()=>onChange(item)}><span>{item}</span></button>)}</div>;

function Field({label,children,hint}){return <label className="jersey-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}

export default function TextileStudio({goTo,caps}){
 const account=useLoyalty(),[initial]=useState(readDraft);
 const[design,setDesign]=useState(initial.design),[idea,setIdea]=useState(initial.idea),[title,setTitle]=useState(initial.title);
 const[step,setStep]=useState(0),[projectId,setProjectId]=useState(()=>crypto.randomUUID()),[projects,setProjects]=useState([]);
 const[generated,setGenerated]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[cloudState,setCloudState]=useState('');
 const lock=useRef(false),stepTitle=useRef(null);
 const readiness=useMemo(()=>designReadiness(design),[design]);

 useEffect(()=>{try{localStorage.setItem('3b-studio-config',JSON.stringify({design,idea,title}));}catch{}},[design,idea,title]);

 useEffect(()=>{
  if(!account.user){setProjects([]);return;}
  let live=true;
  ecosystem('textile-list').then(result=>{if(live)setProjects(result.projects||[]);}).catch(()=>{});
  return()=>{live=false;};
 },[account.user?.id]);

 function change(key,value){setDesign(current=>validateDesign({...current,[key]:value}));setGenerated(null);setCloudState('');}
 function patch(values){setDesign(current=>validateDesign({...current,...values}));setGenerated(null);setCloudState('');}
 function next(value){setStep(Math.max(0,Math.min(STEPS.length-1,value)));setTimeout(()=>stepTitle.current?.focus({preventScroll:true}),0);}
 function fresh(){setProjectId(crypto.randomUUID());setTitle('Mon maillot 3B');setDesign(DEFAULT_DESIGN);setIdea('');setGenerated(null);setStep(0);setCloudState('');setNotice('Nouveau projet prêt.');}
 function loadProject(project){
  try{setProjectId(project.id);setTitle(project.title);setDesign(validateDesign(project.design));setIdea(project.idea||'');setGenerated(project.imageUrl?{imageUrl:project.imageUrl,assetPath:project.asset_path}:null);setStep(0);setCloudState('saved');setNotice('Projet chargé.');}
  catch{setNotice('Ce projet ne peut pas être chargé.');}
 }
 async function saveProject(){
  if(!account.user){goTo('member');return;}if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   await ecosystem('textile-save',{id:projectId,title:title.trim()||'Mon maillot 3B',design,idea,assetPath:generated?.assetPath||null});
   setCloudState('saved');setNotice('Projet enregistré sur ton compte 3B.');
   const result=await ecosystem('textile-list');setProjects(result.projects||[]);
  }catch(e){setNotice(e.message);setCloudState('');}finally{lock.current=false;setBusy(false);}
 }
 async function deleteProject(project){
  if(!account.user||busy)return;
  if(project.id===projectId)fresh();
  setBusy(true);
  try{await ecosystem('textile-delete',{id:project.id});setProjects(list=>list.filter(item=>item.id!==project.id));setNotice('Projet supprimé.');}
  catch(e){setNotice(e.message);}finally{setBusy(false);}
 }
 function exportBrief(){
  const body=textilePrompt(design,idea),url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=(title.trim()||'maillot-3b').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-techpack.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function generate(){
  if(!account.user){goTo('member');return;}if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{const result=await ecosystem('generate',{design,idea});setGenerated(result);setCloudState('');setNotice('Rendu IA prêt. Sauvegarde le projet pour le conserver avec sa fiche technique.');}
  catch(e){setNotice(e.message);}finally{lock.current=false;setBusy(false);}
 }
 function share(){
  try{sessionStorage.setItem('3b-studio-share',JSON.stringify({design,idea,assetPath:generated?.assetPath,title}));goTo('community');}
  catch{setNotice('Le partage est indisponible. Exporte le brief pour le conserver.');}
 }

 const materialOptions=Object.values(MATERIAL_GROUPS)[0],activeStep=STEPS[step];

 return <div className="jersey-studio">
  <div className="jersey-projectbar">
   <div className="jersey-project-title">
    <span>PROJET</span><input value={title} maxLength={100} onChange={e=>{setTitle(e.target.value);setCloudState('');}} aria-label="Nom du projet"/>
    <small>{cloudState==='saved'?<><Cloud size={12}/> Enregistré sur ton compte</>:account.user?'Modification non enregistrée':'Brouillon local'}</small>
   </div>
   <div className="jersey-project-actions"><button type="button" className="quiet-button" onClick={fresh}><RotateCcw size={15}/>Nouveau</button><button type="button" className="surface-button" disabled={busy} onClick={saveProject}><Save size={15}/>{busy?'Enregistrement…':'Enregistrer'}</button></div>
  </div>

  {account.user&&projects.length>0&&<details className="jersey-project-library">
   <summary><FolderOpen size={16}/>Mes créations <b>{projects.length}</b></summary>
   <div className="jersey-project-list">{projects.map(project=><article key={project.id}>
    <button type="button" className="jersey-project-open" onClick={()=>loadProject(project)}><span>{project.title}</span><small>{new Date(project.updated_at).toLocaleDateString('fr-FR')} · {project.design?.jerseySport||'Maillot'}</small></button>
    <button type="button" className="jersey-project-delete" aria-label={'Supprimer '+project.title} onClick={()=>deleteProject(project)}><Trash2 size={15}/></button>
   </article>)}</div>
  </details>}

  <nav className="jersey-stepper" aria-label="Étapes du configurateur">
   {STEPS.map((item,index)=>{const Icon=item.icon;return <button type="button" key={item.id} onClick={()=>next(index)} aria-current={step===index?'step':undefined} className={step===index?'active':index<step?'done':''}>
    <span className="jersey-step-number">{index<step?<Check size={14}/>:index+1}</span><Icon size={16}/><span><b>{item.label}</b><small>{item.help}</small></span>
   </button>;})}
  </nav>

  <div className="jersey-workspace">
   <aside className="jersey-preview-shell">
    <div className="jersey-preview-header"><div><span>APERÇU PRODUIT</span><strong>{design.jerseySport} · {design.cut}</strong></div><span className="jersey-live-pill">LIVE</span></div>
    <div className="jersey-canvas">{generated?<img className="studio-generated" src={generated.imageUrl} alt={'Rendu IA '+title}/>:<DesignPreview design={design}/>}</div>
    <div className="jersey-view-switch" aria-label="Vue du maillot">{['Face','Dos'].map(view=><button type="button" key={view} aria-pressed={design.view===view} onClick={()=>change('view',view)}>{view}</button>)}</div>
    <div className="jersey-preview-meta"><span><b>{design.pattern}</b><small>Graphisme</small></span><span><b>{design.collar.replace(' performance','')}</b><small>Col</small></span><span><b>{design.material.match(/\d+ g\/m²/)?.[0]||'Technique'}</b><small>Matière</small></span></div>
    <p className="jersey-preview-note">Aperçu de conception. Le logo 3B est représenté par une zone de placement ; le fichier officiel reste intact pour la production.</p>
   </aside>

   <section className="jersey-controls">
    <header className="jersey-controls-heading"><div><p className="eyebrow">ÉTAPE {step+1} / {STEPS.length}</p><h2 ref={stepTitle} tabIndex={-1}>{activeStep.label}</h2><p>{activeStep.help}</p></div><span>{Math.round(((step+1)/STEPS.length)*100)}%</span></header>

    {step===0&&<div className="jersey-control-body">
     <div className="jersey-block"><div className="jersey-block-title"><span>01</span><div><h3>Quel type de maillot ?</h3><p>Le patron change réellement selon la pratique.</p></div></div><OptionGrid items={JERSEY_SPORTS} value={design.jerseySport} onChange={value=>patch({jerseySport:value,sleeve:value==='Basketball'?'Sans manches':design.sleeve})}/></div>
     <div className="jersey-block"><div className="jersey-block-title"><span>02</span><div><h3>Pars d’une direction premium</h3><p>Un preset remplit toute la base, puis tu modifies chaque détail.</p></div></div>
      <div className="jersey-preset-grid">{Object.entries(JERSEY_PRESETS).map(([name,preset])=><button type="button" key={name} onClick={()=>patch(preset)}><i style={{background:'linear-gradient(135deg,'+preset.color+','+preset.secondary+')'}}/><span><b>{name}</b><small>{preset.jerseySport} · {preset.pattern}</small></span><ArrowRight size={15}/></button>)}</div>
     </div>
     <div className="jersey-block"><div className="jersey-block-title"><span>03</span><div><h3>Coupe générale</h3><p>Choisis le volume avant de travailler les détails.</p></div></div><OptionGrid items={['Pro ajustée','Athletic','Regular','Oversize']} value={design.cut} onChange={value=>change('cut',value)}/></div>
    </div>}

    {step===1&&<div className="jersey-control-body">
     <div className="jersey-block"><div className="jersey-block-title"><span>01</span><div><h3>Manches</h3><p>Le maillot basket bascule automatiquement en sans manches au départ.</p></div></div><OptionGrid items={JERSEY_SLEEVES} value={design.sleeve} onChange={value=>change('sleeve',value)}/></div>
     <div className="jersey-block"><div className="jersey-block-title"><span>02</span><div><h3>Col</h3><p>Le col influence immédiatement la silhouette du prototype.</p></div></div><OptionGrid items={JERSEY_COLLARS} value={design.collar} onChange={value=>change('collar',value)}/></div>
     <div className="jersey-block"><div className="jersey-block-title"><span>03</span><div><h3>Assemblage</h3><p>Raglan pour la mobilité, panneaux pour une construction plus technique.</p></div></div><OptionGrid items={JERSEY_CONSTRUCTIONS} value={design.construction} onChange={value=>change('construction',value)}/></div>
     <div className="jersey-block"><div className="jersey-block-title"><span>04</span><div><h3>Bas du maillot</h3><p>Dernier détail de patronage visible.</p></div></div><OptionGrid items={JERSEY_HEMS} value={design.hem} onChange={value=>change('hem',value)}/></div>
    </div>}

    {step===2&&<div className="jersey-control-body">
     <div className="jersey-block"><div className="jersey-block-title"><span>01</span><div><h3>Palette</h3><p>Trois couleurs contrôlées : base, secondaire et accent.</p></div></div>
      <div className="jersey-color-grid">{[['color','Principale'],['secondary','Secondaire'],['accent','Accent']].map(([key,label])=><Field key={key} label={label}><div className="jersey-color-control"><input type="color" value={design[key]} onChange={e=>change(key,e.target.value)}/><code>{design[key].toUpperCase()}</code></div></Field>)}</div>
     </div>
     <div className="jersey-block"><div className="jersey-block-title"><span>02</span><div><h3>Construction graphique</h3><p>Le motif suit le patron du maillot au lieu d’être un simple fond.</p></div></div><OptionGrid items={PATTERNS.filter(x=>['Uni','Bandes latérales','Bande centrale','Chevron poitrine','Diagonal dynamique','Dégradé','Matrix','Topographie','Carte urbaine','Rayures','Monogramme','Géométrique','Damier'].includes(x))} value={design.pattern} onChange={value=>change('pattern',value)} className="jersey-pattern-grid"/></div>
     <div className="jersey-block jersey-lock-card"><CheckCircle2 size={21}/><div><h3>Zone logo 3B protégée</h3><p>Le configurateur réserve la zone de pose ; il ne redessine pas le logo officiel. Le placement de production reste verrouillé dans le brief technique.</p></div></div>
    </div>}

    {step===3&&<div className="jersey-control-body">
     <div className="jersey-form-grid">
      <Field label="Nom d’équipe"><input maxLength={64} value={design.teamName} onChange={e=>change('teamName',e.target.value)} placeholder="3B INTERNATIONAL"/></Field>
      <Field label="Nom joueur / pseudo"><input maxLength={64} value={design.playerName} onChange={e=>change('playerName',e.target.value)} placeholder="ZAKARIA"/></Field>
      <Field label="Numéro"><input maxLength={3} inputMode="numeric" value={design.playerNumber} onChange={e=>change('playerNumber',e.target.value.replace(/[^0-9]/g,'').slice(0,3))} placeholder="18"/></Field>
      <Field label="Sponsor texte"><input maxLength={64} value={design.frontSponsor} onChange={e=>change('frontSponsor',e.target.value)} placeholder="Facultatif"/></Field>
      <Field label="Texte manche"><input maxLength={64} value={design.sleeveText} onChange={e=>change('sleeveText',e.target.value)} placeholder="FRANCE"/></Field>
      <Field label="Texte bas du maillot"><input maxLength={64} value={design.hemText} onChange={e=>change('hemText',e.target.value)} placeholder="BLACK BLANC BEUR"/></Field>
     </div>
     <div className="jersey-block"><div className="jersey-block-title"><span>01</span><div><h3>Style du numéro</h3><p>Visible immédiatement sur la vue dos.</p></div></div><OptionGrid items={JERSEY_NUMBER_STYLES} value={design.numberStyle} onChange={value=>change('numberStyle',value)}/></div>
     <div className="jersey-block"><div className="jersey-block-title"><span>02</span><div><h3>Placement 3B</h3><p>La position officielle est proposée en premier.</p></div></div><OptionGrid items={JERSEY_LOGO_PLACEMENTS} value={design.logoPlacement} onChange={value=>change('logoPlacement',value)}/></div>
    </div>}

    {step===4&&<div className="jersey-control-body">
     <div className="jersey-form-grid">
      <Field label="Matière"><select value={design.material} onChange={e=>change('material',e.target.value)}>{materialOptions.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Méthode d’impression"><select value={design.printMethod} onChange={e=>change('printMethod',e.target.value)}>{JERSEY_PRINT_METHODS.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Tailles"><select value={design.sizeRange} onChange={e=>change('sizeRange',e.target.value)}>{JERSEY_SIZES.map(item=><option key={item}>{item}</option>)}</select></Field>
      <Field label="Quantité cible"><input type="number" min="1" max="100000" value={design.quantity} onChange={e=>change('quantity',Math.max(1,Math.min(100000,Number(e.target.value)||1)))}/></Field>
     </div>
     <Field label="Notes atelier" hint="Usage, contraintes, détails de couture, finition souhaitée…"><textarea rows={4} maxLength={2000} value={idea} onChange={e=>{setIdea(e.target.value);setGenerated(null);setCloudState('');}} placeholder="Ex. maillot premium léger, respirant, compétition, finition col renforcée…"/></Field>
     <div className="jersey-readiness"><div className="jersey-readiness-head"><CheckCircle2 size={21}/><div><h3>Prêt pour le brief atelier</h3><p>{readiness.ready?'Les informations essentielles sont renseignées.':'Complète les points manquants avant fabrication.'}</p></div></div>{readiness.checks.map(check=><div key={check.id} className={check.ok?'ok':''}><span>{check.ok?<Check size={13}/>:null}</span>{check.label}</div>)}</div>
     <div className="jersey-production-summary"><div><span>SPORT</span><strong>{design.jerseySport}</strong></div><div><span>MATIÈRE</span><strong>{design.material}</strong></div><div><span>IMPRESSION</span><strong>{design.printMethod}</strong></div><div><span>VOLUME</span><strong>{design.quantity} pièces · {design.sizeRange}</strong></div></div>
     <div className="jersey-final-actions"><button type="button" className="surface-button" disabled={busy||!caps?.image} onClick={generate}><Sparkles size={17}/>{busy?'Création…':caps?.image?'Générer un rendu IA':'IA visuelle non activée'}</button><button type="button" className="quiet-button" onClick={exportBrief}><Download size={16}/>Exporter fiche technique</button><button type="button" className="quiet-button" onClick={share}><ArrowRight size={16}/>Partager au collectif</button></div>
     {generated&&<div className="jersey-generated-note"><Sparkles size={18}/><div><strong>Rendu IA généré</strong><p>Le rendu sert à visualiser l’intention. La fiche technique reste la référence pour l’atelier.</p></div></div>}
     <details className="jersey-techpack"><summary>Voir le brief technique complet</summary><pre>{textilePrompt(design,idea)}</pre></details>
     <div className="jersey-techniques"><span>Finitions complémentaires</span><div>{TECHNIQUES.slice(0,10).map(t=><button type="button" key={t} className={design.techniques.includes(t)?'active':''} onClick={()=>change('techniques',design.techniques.includes(t)?design.techniques.filter(x=>x!==t):[...design.techniques,t].slice(0,8))}>{t}</button>)}</div></div>
    </div>}

    <footer className="jersey-step-actions"><button type="button" className="quiet-button" disabled={step===0||busy} onClick={()=>next(step-1)}><ArrowLeft size={16}/>Retour</button>{step<STEPS.length-1?<button type="button" className="surface-button" disabled={busy} onClick={()=>next(step+1)}>Continuer <ArrowRight size={16}/></button>:<button type="button" className="surface-button" disabled={busy} onClick={saveProject}><Save size={16}/>Enregistrer le projet</button>}</footer>
   </section>
  </div>
  {notice&&<p className="surface-notice jersey-notice" role="status">{notice}</p>}
 </div>;
}
