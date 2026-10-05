import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Film,Plus,Save,Trash2,Upload} from 'lucide-react';
import {destinRequest,inspectVideo,sourceUrl,uploadMedia} from './client.js';
import {newManifest,newScene,validateManifest,validatePoll} from './model.js';
import DestinPlayer,{previewSnapshot} from './DestinPlayer.jsx';
import {lockedDraft,validateLockedManifest} from './lockedPolicy.js';
import './director.css';

const copy = value => JSON.parse(JSON.stringify(value));
const localTomorrow = () => { const d=new Date(Date.now()+86400000); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
function NumberField({label,value,onChange,min=0,max=14400,step=0.1}) { return <label>{label}<input type="number" min={min} max={max} step={step} value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.target.value===''?0:Number(e.target.value))}/></label>; }
export default function DestinStudio({userId,onClose}) {
  const [projects,setProjects]=useState([]),[record,setRecord]=useState(null),[manifest,setManifest]=useState(()=>lockedDraft(newManifest())),[selected,setSelected]=useState('intro');
  const [busy,setBusy]=useState(true),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[media,setMedia]=useState({}),[preview,setPreview]=useState(null);
  const [pollQuestion,setPollQuestion]=useState(''),[pollAnswers,setPollAnswers]=useState(['','']),[closes,setCloses]=useState(localTomorrow);
  const live=useRef(true),booted=useRef(false),cacheKey='3b_destin_draft_v1:'+userId;
  const node=manifest.nodes.find(n=>n.id===selected) || manifest.nodes[0];
  const problems=validateLockedManifest(manifest);
  useEffect(()=>{
    live.current=true;
    destinRequest('editor',{},userId).then(result=>{
      if(!live.current)return;
      setProjects(result.stories || []);
      let cached=null; try{cached=JSON.parse(sessionStorage.getItem(cacheKey)||'null');}catch{}
      if(cached?.manifest?.schema===1 && Array.isArray(cached.manifest.nodes) && cached.manifest.nodes.length<=64){
        setManifest(lockedDraft(cached.manifest));setRecord(cached.record);setSelected(cached.manifest.entry);setDirty(true);setMessage('Brouillon de cet onglet récupéré. Enregistre-le pour le conserver en ligne.');
      }else if(result.stories?.length){const first=result.stories[0];setRecord(first);setManifest(lockedDraft(copy(first.draft)));setSelected(first.draft.entry);}
      booted.current=true;
    }).catch(e=>{if(live.current)setError(e.message);}).finally(()=>{if(live.current)setBusy(false);});
    return()=>{live.current=false;};
  },[userId]);
  useEffect(()=>{
    if(!booted.current || !dirty)return;
    const timer=setTimeout(()=>{try{sessionStorage.setItem(cacheKey,JSON.stringify({record:record?{id:record.id,revision:record.revision,status:record.status}:null,manifest}));}catch{setMessage('La copie locale est indisponible. Enregistre ton brouillon en ligne.');}},500);
    const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);
    return()=>{clearTimeout(timer);window.removeEventListener('beforeunload',warn);};
  },[manifest,dirty,record,cacheKey]);
  function change(fn){setManifest(old=>fn(copy(old)));setDirty(true);setMessage('');}
  function editNode(patch){change(m=>{m.nodes=m.nodes.map(n=>n.id===node.id?{...n,...patch}:n);return m;});}
  function changeChoice(index,patch){editNode({choices:node.choices.map((c,i)=>i===index?{...c,...patch}:c)});}
  function changeEnding(patch){editNode({ending:{...node.ending,...patch}});}
  function clearCache(){try{sessionStorage.removeItem(cacheKey);}catch{}}
  function openProject(id){
    if(dirty && !window.confirm('Changer de projet sans enregistrer les dernières modifications ?'))return;
    const p=projects.find(x=>x.id===id),m=lockedDraft(p?copy(p.draft):newManifest());
    setRecord(p||null);setManifest(m);setSelected(m.entry);setDirty(false);setError('');setMessage('');setMedia({});clearCache();
  }
  async function saveProject(){
    const result=await destinRequest('save',{id:record?.id,revision:record?.revision,manifest},userId);
    if(!live.current)return result.story;
    setRecord(result.story);setProjects(old=>[result.story,...old.filter(p=>p.id!==result.story.id)]);setDirty(false);clearCache();
    return result.story;
  }
  async function operation(fn){if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();}catch(e){if(live.current)setError(e.message||'Cette action n’a pas abouti.');}finally{if(live.current)setBusy(false);}}
  async function importAsset(file,field){
    if(!file)return;
    await operation(async()=>{
      const uploaded=await uploadMedia(file,userId);
      if(!live.current)return;
      setMedia(old=>({...old,[uploaded.source]:uploaded.url}));
      if(field==='cover')change(m=>({...m,cover:uploaded.source}));
      else if(field==='src'){
        const info=await inspectVideo(uploaded.url);
        if(!live.current)return;
        editNode({src:uploaded.source,start:0,end:Math.min(info.duration,node.ending?20:30),sourceName:file.name});
      }else editNode({caption:uploaded.source});
      setMessage('Média importé dans ton espace privé.');
    });
  }
  async function preparePreview(){
    const errors=validateManifest(manifest);
    if(errors.length)throw Error(errors[0]);
    const result=await destinRequest('preview',{manifest},userId);setMedia(result.media);return result.media;
  }
  async function publish(){
    const lockedErrors=validateLockedManifest(manifest);
    if(lockedErrors.length)throw Error(lockedErrors[0]);
    const signed=await preparePreview();
    setMessage('Vérification de la lecture et des durées de chaque vidéo…');
    const sources=[...new Set(manifest.nodes.map(n=>n.src))],durations=new Map();
    for(let i=0;i<sources.length;i+=3){
      await Promise.all(sources.slice(i,i+3).map(async source=>{const info=await inspectVideo(sourceUrl(source,signed));durations.set(source,info.duration);}));
    }
    for(const n of manifest.nodes)if(n.end>durations.get(n.src)+0.05)throw Error(`${n.title} : la fin de scène dépasse la durée de sa vidéo (${durations.get(n.src).toFixed(1)} s).`);
    const saved=await saveProject();
    const result=await destinRequest('publish',{id:saved.id,revision:saved.revision,manifest},userId);
    if(!live.current)return;
    setRecord({...saved,status:'published',published_release:result.releaseId});setProjects(old=>old.map(p=>p.id===saved.id?{...p,status:'published'}:p));
    setMessage(`Film publié · version ${result.version}. Il est maintenant disponible dans le catalogue 3B DESTIN.`);
  }
  function addScene(){
    const id='scene-'+crypto.randomUUID().slice(0,8);
    change(m=>{m.nodes.push({...newScene(id),ending:{id:'fin-'+crypto.randomUUID().slice(0,8),title:'Un nouvel horizon',fragment:'',rarity:'standard',reward:false},question:''});return m;});setSelected(id);
  }
  function removeScene(){
    if(manifest.entry===node.id || manifest.nodes.some(n=>n.choices.some(c=>c.target===node.id)))return;
    change(m=>{m.nodes=m.nodes.filter(n=>n.id!==node.id);return m;});setSelected(manifest.entry);
  }
  function exportProject(){const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='3B-DESTIN-projet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importProject(file){
    if(!file)return;
    await operation(async()=>{
      if(file.size>524288)throw Error('Le fichier projet est trop volumineux.');
      let m;try{m=JSON.parse(await file.text());}catch{throw Error('Ce fichier n’est pas un projet JSON valide.');}
      if(m.schema!==1 || !Array.isArray(m.nodes) || !m.nodes.length || m.nodes.length>64 || m.nodes.some(n=>!n || typeof n.id!=='string' || !Array.isArray(n.choices)))throw Error('Structure de projet non reconnue.');
      if(dirty && !window.confirm('Remplacer le brouillon non enregistré par ce projet ?'))return;
      setRecord(null);setManifest(lockedDraft(m));setSelected(m.entry);setDirty(true);setMedia({});setMessage('Projet importé comme nouveau brouillon. Les médias privés restent liés au compte qui les a importés.');
    });
  }
  async function publishPoll(){
    const payload={question:pollQuestion.trim(),options:pollAnswers.map((label,i)=>({id:'option-'+(i+1),label:label.trim()})),closesAt:new Date(closes).toISOString()};
    const invalid=validatePoll(payload);if(invalid)throw Error(invalid);
    await destinRequest('poll-create',payload,userId);setPollQuestion('');setPollAnswers(['','']);setMessage('Vote collectif publié. Une seule réponse est comptée par compte.');
  }
  if(preview)return <DestinPlayer key={preview.key} initialSnapshot={previewSnapshot(manifest,preview.media)} userId={userId} preview onClose={()=>setPreview(null)} onRestart={()=>setPreview(p=>({...p,key:crypto.randomUUID()}))}/>;
  return <section className="destin destin-studio" aria-labelledby="destin-studio-title">
    <div className="destin-studio-heading"><div><span className="destin-kicker">DIRECTEUR · ACCÈS CRÉATEUR</span><h1 id="destin-studio-title">Studio DESTIN</h1><p className="destin-muted">Tous les chemins sont ouverts dans ton Studio. Les choix des spectateurs restent définitifs.</p></div><button className="destin-secondary" onClick={()=>{if(!dirty || window.confirm('Quitter le studio ? La copie de ce brouillon reste dans cet onglet.'))onClose();}}><ArrowLeft size={17}/>Retour aux films</button></div>
    <div className="destin-toolbar"><label style={{minWidth:220}}>Projet<select value={record?.id || ''} disabled={busy} onChange={e=>openProject(e.target.value)}><option value="">Nouveau film</option>{projects.map(p=><option key={p.id} value={p.id}>{p.draft.title || 'Sans titre'} · {p.status==='published'?'Publié':p.status==='archived'?'Archivé':'Brouillon'}</option>)}</select></label><div className="destin-actions"><button disabled={busy} onClick={()=>operation(async()=>{await saveProject();setMessage('Brouillon enregistré en ligne. Le film public n’a pas changé.');})}><Save size={17}/>Enregistrer</button><button disabled={busy || problems.length>0} onClick={()=>operation(async()=>{const signed=await preparePreview();setPreview({key:crypto.randomUUID(),media:signed});})}><Film size={17}/>Prévisualiser</button><button className="destin-primary" disabled={busy || problems.length>0} onClick={()=>operation(publish)}><Upload size={17}/>{record?.status==='published'?'Publier la nouvelle version':'Publier le film'}</button></div></div>
    {busy && <div className="destin-notice" role="status"><span className="destin-loader"/> Opération en cours…</div>}{error && <div className="destin-alert" role="alert">{error}</div>}{message && <p className="destin-notice" role="status">{message}</p>}
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
    <div className="destin-project-meta destin-form-grid"><label>Titre du film<input maxLength={100} value={manifest.title} onChange={e=>change(m=>({...m,title:e.target.value}))}/></label><label>Première scène<select value={manifest.entry} onChange={e=>change(m=>({...m,entry:e.target.value}))}>{manifest.nodes.map(n=><option value={n.id} key={n.id}>{n.title || n.id}</option>)}</select></label><label className="destin-span">Présentation<textarea maxLength={1200} value={manifest.synopsis} onChange={e=>change(m=>({...m,synopsis:e.target.value}))}/></label><label>Importer l’affiche<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{importAsset(e.target.files?.[0],'cover');e.target.value='';}}/></label><label>Ou adresse HTTPS de l’affiche<input type="text" value={manifest.cover} placeholder="https://…" onChange={e=>change(m=>({...m,cover:e.target.value.trim()}))}/></label></div>
    <div className="destin-studio-grid"><aside className="destin-scene-list" aria-label="Scènes du film">{manifest.nodes.map((n,i)=><button key={n.id} onClick={()=>setSelected(n.id)} aria-pressed={node?.id===n.id}><span className="destin-scene-number">{String(i+1).padStart(2,'0')}</span><span>{n.title || 'Scène sans titre'}<small style={{display:'block',fontSize:11,color:'var(--dt-muted)'}}>{n.id===manifest.entry?'Départ · ':''}{n.ending?'Fin':`${n.choices.length} choix`}</small></span></button>)}<button onClick={addScene} disabled={manifest.nodes.length>=64}><Plus size={17}/>Ajouter une scène</button></aside>
    {node && <div className="destin-editor-panel"><label className="destin-field">Nom de cette scène<input maxLength={100} value={node.title} onChange={e=>editNode({title:e.target.value})}/></label><div className="destin-form-grid"><label>Importer sa vidéo<input type="file" accept="video/mp4,video/webm" onChange={e=>{importAsset(e.target.files?.[0],'src');e.target.value='';}}/><small>MP4 ou WebM · 50 Mo maximum par fichier.</small></label><div className="destin-private-media-note"><strong>Une scène, un fichier privé.</strong><p>Importe chaque chemin séparément. Les vidéos des autres branches ne sont jamais préchargées chez le spectateur.</p></div><label className="destin-span">Vidéo privée de cette scène<input type="text" readOnly value={node.sourceName || (node.src?'Vidéo importée':'Aucune vidéo importée')}/></label><NumberField label="Début du segment (secondes)" value={node.start} onChange={start=>editNode({start})}/><NumberField label={node.ending?'Fin du segment (secondes)':'Apparition de la question (secondes dans la vidéo)'} value={node.end} onChange={end=>editNode({end})}/></div>
    <p className="destin-muted">La vidéo joue de {node.start} à {node.end} secondes, puis laisse place {node.ending?'à cette fin.':'à tes réponses.'}</p><button onClick={()=>operation(async()=>{const r=await destinRequest('media',{sources:[node.src]},userId);setMedia(old=>({...old,...r.media}));const info=await inspectVideo(sourceUrl(node.src,r.media));setMessage(`Vidéo lisible · ${info.duration.toFixed(1)} secondes · ${info.width} × ${info.height}.`);})} disabled={!node.src}>Vérifier cette vidéo</button>
    {sourceUrl(node.src,media) && media[node.src] && <video className="destin-editor-video" key={media[node.src]} src={media[node.src]} controls playsInline preload="metadata"/>}
    <hr/><label className="destin-check"><input type="checkbox" checked={!!node.ending} onChange={e=>editNode(e.target.checked?{choices:[],ending:{id:'fin-'+node.id,title:node.title,fragment:'',rarity:'standard',reward:false}}:{ending:null,question:'Que décides-tu ?',choices:[{id:'a',label:'Premier choix',target:'',minLevel:1,requiresEnding:''},{id:'b',label:'Deuxième choix',target:'',minLevel:1,requiresEnding:''}],timeout:0,defaultChoice:''})}/>Cette scène termine le parcours</label>
    {node.ending?<div className="destin-form-grid" style={{marginTop:20}}><label>Nom de la fin<input maxLength={120} value={node.ending.title} onChange={e=>changeEnding({title:e.target.value})}/></label><label>Rareté<select value={node.ending.rarity} onChange={e=>changeEnding({rarity:e.target.value})}><option value="standard">Classique</option><option value="rare">Rare</option><option value="secret">Secrète</option></select></label><label className="destin-span">Nom du fragment, facultatif<input maxLength={100} value={node.ending.fragment} onChange={e=>changeEnding({fragment:e.target.value})}/></label><label className="destin-check destin-span"><input type="checkbox" checked={node.ending.reward} onChange={e=>changeEnding({reward:e.target.checked})}/>Activer la récompense Passeport pour cette fin</label><p className="destin-muted destin-span">Récompense calculée et plafonnée par le serveur. Une seule attribution par fin, sans récompense dans les prévisualisations Directeur.</p></div>:<><label className="destin-field" style={{marginTop:20}}>Question à l’écran<textarea maxLength={240} value={node.question} onChange={e=>editNode({question:e.target.value})}/></label>{node.choices.map((c,i)=><div className="destin-choice-editor" key={c.id}><label>Réponse {String.fromCharCode(65+i)}<input maxLength={100} value={c.label} onChange={e=>changeChoice(i,{label:e.target.value})}/></label><label>Scène suivante<select value={c.target} onChange={e=>changeChoice(i,{target:e.target.value})}><option value="">Relier une scène…</option>{manifest.nodes.filter(n=>n.id!==node.id).map(n=><option key={n.id} value={n.id}>{n.title || n.id}</option>)}</select></label><button className="destin-icon" disabled={node.choices.length<=2} aria-label={`Retirer la réponse ${String.fromCharCode(65+i)}`} onClick={()=>editNode({choices:node.choices.filter((_,j)=>j!==i)})}><Trash2 size={17}/></button><details><summary>Condition de déblocage</summary><div className="destin-form-grid"><NumberField label="Niveau minimum" value={c.minLevel} min={1} max={1000} step={1} onChange={minLevel=>changeChoice(i,{minLevel})}/><p className="destin-muted">Aucune autre fin de cette histoire ne peut être exigée : chaque personne conserve un seul chemin.</p></div></details></div>)}<button disabled={node.choices.length>=4} onClick={()=>editNode({choices:[...node.choices,{id:'c-'+crypto.randomUUID().slice(0,8),label:'Nouveau choix',target:'',minLevel:1,requiresEnding:''}]})}><Plus size={17}/>Ajouter une réponse</button><p className="destin-locked-rule">Choix définitif après confirmation. Aucun compte à rebours ne choisit à la place du spectateur.</p></>}
    <details><summary>Sous-titres et suppression de scène</summary><label className="destin-field">Sous-titres français au format VTT<input type="file" accept=".vtt,text/vtt" onChange={e=>{importAsset(e.target.files?.[0],'caption');e.target.value='';}}/></label>{node.caption && <button onClick={()=>editNode({caption:''})}>Retirer les sous-titres</button>}<p className="destin-muted">Une scène encore utilisée doit d’abord être détachée des réponses qui y conduisent.</p><button disabled={manifest.nodes.length<=1 || manifest.entry===node.id || manifest.nodes.some(n=>n.choices.some(c=>c.target===node.id))} onClick={removeScene}><Trash2 size={17}/>Supprimer cette scène</button></details></div>}</div>
    {problems.length>0?<details className="destin-validation" open><summary>{problems.length} point{problems.length>1?'s':''} à compléter avant publication</summary><ul>{problems.map(p=><li key={p}>{p}</li>)}</ul></details>:<p className="destin-notice"><Check size={17}/> Tous les chemins sont reliés. La lecture des vidéos sera contrôlée avant publication.</p>}
    <details><summary>Sauvegarde de fichier et retrait du catalogue</summary><div className="destin-import-export"><button onClick={exportProject}>Exporter le projet JSON</button><label>Importer un projet<input type="file" accept="application/json,.json" onChange={e=>{importProject(e.target.files?.[0]);e.target.value='';}}/></label>{record?.status==='published' && <button onClick={()=>operation(async()=>{if(!window.confirm('Retirer ce film du catalogue public ? Les parcours restent conservés.'))return;await destinRequest('archive',{id:record.id,revision:record.revision},userId);setRecord(r=>({...r,status:'archived'}));setMessage('Film retiré du catalogue.');})}>Retirer le film du catalogue</button>}</div></details>
    <details style={{marginTop:32}}><summary>Créer un vote collectif</summary><p className="destin-muted">La communauté vote dans l’onglet Votes. Le résultat sert à décider du prochain épisode, sans fabriquer automatiquement une vidéo.</p><div className="destin-form-grid"><label className="destin-span">Question<textarea maxLength={240} value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)}/></label>{pollAnswers.map((answer,i)=><label key={i}>Réponse {String.fromCharCode(65+i)}<input maxLength={100} value={answer} onChange={e=>setPollAnswers(old=>old.map((a,j)=>j===i?e.target.value:a))}/></label>)}<label>Clôture du vote<input type="datetime-local" value={closes} onChange={e=>setCloses(e.target.value)}/></label></div><div className="destin-actions" style={{marginTop:20}}><button disabled={pollAnswers.length>=4} onClick={()=>setPollAnswers(a=>[...a,''])}>Ajouter une réponse</button>{pollAnswers.length>2 && <button onClick={()=>setPollAnswers(a=>a.slice(0,-1))}>Retirer la dernière réponse</button>}<button className="destin-primary" onClick={()=>operation(publishPoll)}>Publier le vote</button></div></details>
    </fieldset>
  </section>;
}
