import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Boxes,CheckCircle2,Cloud,Download,Flag,Plus,Search,Upload,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {controlCenterRequest} from './client.js';
import {getPageHref} from '../lib/navigation.js';
import {PROJECT_DEFINITIONS,PROJECT_STATUSES,applyProjectAction,createProjectTask,exportProjectBackup,loadProjectState,mergeProjectBackup,projectSummary,restoreProjectState,saveProjectState,searchProjectTasks} from './projects-model.js';
import './projects-center.css';

function TaskEditor({task,onSave,onCancel,onDelete}){
 const [draft,setDraft]=useState(task),[error,setError]=useState('');
 const set=(key,value)=>setDraft(current=>({...current,[key]:value}));
 return <form className="threeb-project-editor" onSubmit={event=>{event.preventDefault();try{onSave(draft);}catch(cause){setError(cause.message);}}}>
  <label>Jalon vérifiable<input autoFocus required maxLength={180} value={draft.title} onChange={event=>set('title',event.target.value)} placeholder="Ex. Tester la connexion sur Android"/></label>
  <div className="threeb-project-fields">
   <label>Responsable<input maxLength={80} value={draft.owner} onChange={event=>set('owner',event.target.value)} placeholder="À attribuer"/></label>
   <label>Échéance<input type="date" value={draft.dueDate} onChange={event=>set('dueDate',event.target.value)}/></label>
   <label>Priorité<select value={draft.priority} onChange={event=>set('priority',event.target.value)}><option value="normal">Normale</option><option value="high">Haute</option></select></label>
  </div>
  <label>Critère de réussite, résultat ou blocage<textarea maxLength={3000} rows={3} value={draft.notes} onChange={event=>set('notes',event.target.value)} placeholder="Décris ce qui doit fonctionner et garde la preuve de ton contrôle."/></label>
  {error&&<p role="alert">{error}</p>}
  <div className="threeb-project-editor-actions">{onDelete&&<Button variant="danger" size="sm" type="button" onClick={onDelete}>Supprimer</Button>}<Button variant="ghost" size="sm" type="button" onClick={onCancel}>Annuler</Button><Button variant="champagne" size="sm" type="submit">Enregistrer le jalon</Button></div>
 </form>;
}

export default function ProjectsCenterPanel({pulse}){
 const account=useLoyalty(),ownerId=account?.user?.id||'';
 const [verifiedOwner,setVerifiedOwner]=useState(''),[accessError,setAccessError]=useState(''),[accessAttempt,setAccessAttempt]=useState(0);
 useEffect(()=>{
  let active=true;setVerifiedOwner('');setAccessError('');
  if(ownerId)controlCenterRequest('status').then(result=>{if(active&&result.ok===true)setVerifiedOwner(ownerId);}).catch(error=>{if(active)setAccessError(error.message||'Vérification indisponible.');});
  return()=>{active=false;};
 },[ownerId,accessAttempt]);
 if(!ownerId||verifiedOwner!==ownerId)return <section className="control-section control-projects" id="cc-projects" aria-label="Projets 3B"><p className="control-kicker"><Boxes size={13}/> PROJETS · ACCÈS PROPRIÉTAIRE</p><h2>Projects Center</h2><p>{!ownerId?'Connecte-toi au compte propriétaire pour ouvrir tes jalons.':accessError||'Vérification de l’accès propriétaire…'}</p>{ownerId&&accessError&&<Button variant="ghost" size="sm" onClick={()=>setAccessAttempt(value=>value+1)}>Réessayer la vérification</Button>}</section>;
 return <ProjectsWorkspace key={ownerId} ownerId={ownerId} pulse={pulse}/>;
}

function ProjectsWorkspace({pulse,ownerId}){
 const [loaded]=useState(()=>loadProjectState(undefined,ownerId)),[state,setState]=useState(loaded.state),[notice,setNotice]=useState(loaded.notice),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[editing,setEditing]=useState(null),[backup,setBackup]=useState(null),[undo,setUndo]=useState(null);
 const fileInput=useRef(null);
 const selected=PROJECT_DEFINITIONS.find(project=>project.id===state.selectedProject)||PROJECT_DEFINITIONS[0];
 const summary=projectSummary(state.tasks,selected.id),total=projectSummary(state.tasks);
 const tasks=searchProjectTasks(state.tasks,{projectId:selected.id,query,status:filter});
 function commit(next,message='Jalons enregistrés sur cet appareil.',remember=true){
  if(remember)setUndo(state);
  setState(next);
  const saved=saveProjectState(next,undefined,ownerId);
  setNotice(saved.ok?message:saved.notice);
 }
 function act(action){commit(applyProjectAction(state,action),undefined,action.type!=='select');}
 function download(){
  const url=URL.createObjectURL(new Blob([exportProjectBackup(state)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='3b-jalons-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice('Sauvegarde téléchargée. Elle contient les responsables et les notes de tes jalons.');
 }
 async function readBackup(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
   if(file.size>4000000)throw Error('Le fichier dépasse la limite de 4 Mo.');
   const source=await file.text(),merged=mergeProjectBackup(state,source);
   setBackup({source,added:merged.added,updated:merged.updated});
  }catch(error){setNotice('Import impossible : '+error.message);}
 }
 return <section className="control-section control-projects threeb-project-center control-hide-in-focus" id="cc-projects" aria-label="Projets 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Boxes size={13}/> PROJETS · JALONS VÉRIFIABLES</p><h2>Projects Center</h2></div>
   <span className="control-projects-badge">{PROJECT_DEFINITIONS.length} PROJETS</span>
  </header>
  <div className="control-projects-lead"><Cloud size={17}/><div><strong>Application 3B</strong><small>{pulse?.production===true?'Production répond au contrôle réel':pulse?.production===false?'Production à vérifier':'Contrôle production en cours'}</small></div><span>{pulse?.commitSha||'main'}</span></div>
  <div className="threeb-project-intro"><div><strong>Transformer les idées en étapes.</strong><p>{total.done} jalon{total.done>1?'s':''} terminé{total.done>1?'s':''} sur {total.total} · {total.blocked} bloqué{total.blocked>1?'s':''}</p></div><span>LOCAL · CET APPAREIL</span></div>
  <div className="threeb-project-picker" aria-label="Choisir un projet">
   {PROJECT_DEFINITIONS.map(project=>{const progress=projectSummary(state.tasks,project.id);return <Button variant="ghost" size="sm" type="button" key={project.id} aria-pressed={selected.id===project.id} onClick={()=>{act({type:'select',projectId:project.id});setEditing(null);setFilter('all');setQuery('');}}><span>{project.label}</span><small>{progress.done}/{progress.total} jalons{progress.blocked?' · '+progress.blocked+' bloqué'+(progress.blocked>1?'s':''):''}</small></Button>;})}
  </div>
  <div className="threeb-project-heading"><div><h3>{selected.label}</h3><p>{selected.description}</p></div><a href={getPageHref(selected.route)}>Ouvrir <ArrowUpRight size={14}/></a></div>
  <div className="threeb-project-progress"><progress max={summary.total||1} value={summary.done} aria-label={'Jalons terminés pour '+selected.label}/><span>{summary.done}/{summary.total} terminés par toi</span></div>
  <div className="threeb-project-tools"><label className="threeb-project-search"><Search size={15}/><input aria-label="Rechercher dans les jalons" placeholder="Rechercher un jalon…" value={query} onChange={event=>setQuery(event.target.value)}/></label><select aria-label="Filtrer les jalons" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tous les états</option>{Object.entries(PROJECT_STATUSES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><Button variant="ghost" size="sm" type="button" onClick={()=>setEditing(createProjectTask(selected.id))}><Plus size={14}/> Ajouter</Button></div>
  {editing&&<TaskEditor key={editing.id} task={editing} onCancel={()=>setEditing(null)} onDelete={state.tasks.some(task=>task.id===editing.id)?()=>{act({type:'delete',id:editing.id});setEditing(null);}:undefined} onSave={draft=>{act({type:'save',task:draft});setEditing(null);}}/>}
  <div className="threeb-project-tasks">
   {tasks.map(task=><article key={task.id} className={'threeb-project-task is-'+task.status}>
    <span className="threeb-project-task-icon">{task.status==='done'?<CheckCircle2 size={17}/>:<Flag size={17}/>}</span>
    <div><strong>{task.title}</strong><small>{task.owner||'Responsable à attribuer'}{task.dueDate?' · '+task.dueDate.split('-').reverse().join('/') : ''}{task.priority==='high'?' · Priorité haute':''}</small>{task.notes&&<p>{task.notes}</p>}<Button variant="ghost" size="sm" type="button" onClick={()=>setEditing(task)} aria-label={'Modifier '+task.title}>Modifier les détails</Button></div>
    <select aria-label={'État de '+task.title} value={task.status} onChange={event=>act({type:'status',id:task.id,status:event.target.value})}>{Object.entries(PROJECT_STATUSES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
   </article>)}
   {!tasks.length&&<p className="threeb-project-empty">{query||filter!=='all'?'Aucun jalon ne correspond à ces filtres.':'Ajoute le premier jalon de ce projet.'}</p>}
  </div>
  <div className="threeb-project-backup"><Button variant="ghost" size="sm" type="button" onClick={download}><Download size={14}/> Sauvegarder JSON</Button><Button variant="ghost" size="sm" type="button" onClick={()=>fileInput.current?.click()}><Upload size={14}/> Importer une sauvegarde</Button><Button variant="ghost" size="sm" type="button" disabled={!undo} onClick={()=>{commit(restoreProjectState(state,undo),'Dernière modification annulée.',false);setUndo(null);setEditing(null);}}>Annuler la dernière modification</Button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={readBackup}/></div>
  {backup&&<div className="threeb-project-import" role="region" aria-label="Aperçu de l’import"><strong>Fusion prête : {backup.added} ajout{backup.added>1?'s':''}, {backup.updated} mise{backup.updated>1?'s':''} à jour.</strong><p>Les jalons absents du fichier sont conservés. Pour un même identifiant, la version la plus récente est retenue.</p><Button variant="ghost" size="sm" type="button" onClick={()=>{try{commit(mergeProjectBackup(state,backup.source).state,'Sauvegarde fusionnée et enregistrée sur cet appareil.');setBackup(null);setEditing(null);}catch(error){setNotice('Import impossible : '+error.message);}}}>Fusionner les jalons</Button><Button variant="ghost" size="sm" type="button" onClick={()=>setBackup(null)} aria-label="Annuler l’import"><X size={14}/></Button></div>}
  {notice&&<p className="threeb-project-notice" role="status">{notice}</p>}
  <footer className="control-projects-foot"><Boxes size={13}/><span>Suivi de jalons dédié non connecté au serveur. Les états sont déclarés par toi et restent dans ce navigateur. Aucun pourcentage d’avancement de production n’est déduit de ces jalons. Une sauvegarde JSON permet de les transférer.</span></footer>
 </section>;
}
