export const PROJECT_STORAGE_KEY='3b-projects-center-v1';
export const PROJECT_STATUSES=Object.freeze({todo:'À faire',active:'En cours',blocked:'Bloqué',done:'Terminé'});
const SCHEMA='3b-projects-center',VERSION=1,MAX_TASKS=300;
// Suggestions are not user edits. A stable baseline lets an older real backup
// override untouched templates on a newly opened device.
const PROPOSED_BASELINE='1970-01-01T00:00:00.000Z';
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const validDate=value=>value===''||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value);
export const PROJECT_DEFINITIONS=Object.freeze([
 {id:'application',label:'Application 3B',route:'home',description:'Le parcours commun, de l’accueil au compte.',milestones:[['navigation','Vérifier les parcours mobile et ordinateur'],['access','Contrôler les accès invité, membre et propriétaire'],['release','Documenter les contrôles avant publication']]},
 {id:'world',label:'Monde du 3B',route:'world3b',description:'Exploration, progression et expérience des huit univers.',milestones:[['mobile','Tester l’exploration sur un téléphone réel'],['save','Vérifier la reprise de progression'],['performance','Mesurer la fluidité et les chargements']]},
 {id:'passport',label:'Passeport 3B',route:'passport',description:'Profil 3B, apparence et parcours de vérification.',milestones:[['account','Tester inscription et récupération de compte'],['privacy','Contrôler les données visibles et privées'],['recognition','Documenter les partenaires réellement activés']]},
 {id:'origins',label:'3B Origins',route:'tv',description:'Créations originales et catalogue éditorial.',milestones:[['content','Valider les créations disponibles au public'],['rights','Documenter les droits des contenus'],['playback','Tester la lecture et les liens sur mobile']]},
 {id:'games',label:'Jeux 3B',route:'games',description:'Catalogue, commandes tactiles et scores.',milestones:[['touch','Tester une partie complète au tactile'],['scores','Contrôler l’enregistrement des scores'],['resume','Vérifier les états de pause et de reprise']]},
 {id:'nosbloc',label:'Nosbloc du 3B',route:'nosbloc',description:'Studio de projets, versions et collaboration.',milestones:[['project','Créer et restaurer un projet test'],['team','Tester les invitations et accords d’équipe'],['sync','Vérifier une synchronisation authentifiée']]},
 {id:'guardians',label:'3B Guardians',route:'invisible',description:'Découverte des gardiens et expérience caméra.',milestones:[['camera','Tester permission caméra et solution de repli'],['journey','Parcourir une découverte complète'],['safety','Vérifier les consignes et interactions mobiles']]},
 {id:'stylcam',label:'Stylcam',route:'ia-textile',description:'Création textile et suivi des fichiers générés.',milestones:[['brief','Tester le brief de création textile'],['generation','Vérifier le fournisseur de génération configuré'],['export','Contrôler la provenance et l’export des visuels']]},
 {id:'sport',label:'Sport 3B',route:'sport',description:'Contenus, pratique sportive et directs autorisés.',milestones:[['sources','Vérifier les sources et droits des directs'],['mobile','Tester les contenus et interactions mobiles'],['fallback','Vérifier le comportement sans fournisseur externe']]},
 {id:'shop',label:'Boutique 3B',route:'shop',description:'Catalogue, panier et préparation des commandes.',milestones:[['catalog','Valider produits, tailles, prix et disponibilité'],['order','Tester une commande complète en environnement test'],['operations','Confirmer vendeur, livraison et traitement des retours']]},
 {id:'finance',label:'Finance 3B',route:'finance',description:'Laboratoire banque/crypto et préparation des futurs services.',milestones:[['demo','Tester le registre fictif, les opérations et leur export'],['provider','Choisir le fournisseur et documenter sa recette'],['activation','Vérifier les conditions avant toute activation réelle']]},
 {id:'albert',label:'Albert 3B',route:'albert',description:'Guide local, moteur personnel et actions autorisées.',milestones:[['guide','Tester le guide local et ses parcours'],['engine','Vérifier la connexion au moteur configuré'],['permissions','Tester les permissions et les actions autorisées']]},
]);
const knownProject=id=>PROJECT_DEFINITIONS.some(project=>project.id===id);
const nowIso=()=>new Date().toISOString();

export function createProjectTask(projectId,{id=globalThis.crypto?.randomUUID?.()||`task-${Date.now()}-${Math.random().toString(36).slice(2)}`,now=nowIso()}={}){
 if(!knownProject(projectId))throw Error('Projet inconnu.');
 return {id,projectId,title:'',status:'todo',priority:'normal',owner:'',dueDate:'',notes:'',createdAt:now,updatedAt:now};
}

export function createInitialProjectState(now=nowIso()){
 return {schema:SCHEMA,version:VERSION,selectedProject:'application',updatedAt:now,tasks:PROJECT_DEFINITIONS.flatMap(project=>project.milestones.map(([id,title])=>({...createProjectTask(project.id,{id:project.id+'-'+id,now:PROPOSED_BASELINE}),title})))};
}

function validateTask(raw,now){
 if(!raw||typeof raw!=='object'||!knownProject(raw.projectId)||typeof raw.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(raw.id))throw Error('Un jalon contient un projet ou un identifiant invalide.');
 const title=text(raw.title,180),dueDate=text(raw.dueDate,10);
 if(!title)throw Error('Donne un titre au jalon.');
 if(!Object.hasOwn(PROJECT_STATUSES,raw.status))throw Error('État de jalon inconnu.');
 if(!validDate(dueDate))throw Error('Échéance invalide.');
 return {id:raw.id,projectId:raw.projectId,title,status:raw.status,priority:raw.priority==='high'?'high':'normal',owner:text(raw.owner,80),dueDate,notes:text(raw.notes,3000),createdAt:iso(raw.createdAt)||now,updatedAt:iso(raw.updatedAt)||now};
}

export function parseProjectBackup(source,now=nowIso()){
 if(typeof source==='string'&&source.length>4000000)throw Error('La sauvegarde dépasse la limite de 4 Mo.');
 let raw;try{raw=typeof source==='string'?JSON.parse(source):source;}catch{throw Error('Le fichier JSON est illisible.');}
 if(!raw||raw.schema!==SCHEMA||raw.version!==VERSION||!Array.isArray(raw.tasks))throw Error('Utilise une sauvegarde Projects Center 3B version 1.');
 if(raw.tasks.length>MAX_TASKS)throw Error(`La limite est de ${MAX_TASKS} jalons.`);
 const tasks=raw.tasks.map(task=>validateTask(task,now));
 if(new Set(tasks.map(task=>task.id)).size!==tasks.length)throw Error('La sauvegarde contient des identifiants de jalons en double.');
 return {schema:SCHEMA,version:VERSION,selectedProject:knownProject(raw.selectedProject)?raw.selectedProject:'application',tasks,updatedAt:iso(raw.updatedAt)||now};
}

export function projectStorageKey(ownerId=''){return PROJECT_STORAGE_KEY+(ownerId?':'+text(ownerId,100):'');}
export function loadProjectState(storage=undefined,ownerId=''){
 try{
  const target=storage??globalThis.localStorage,source=target?.getItem(projectStorageKey(ownerId));
  const state=source?parseProjectBackup(source):createInitialProjectState();
  return {state,notice:source?'Derniers jalons chargés depuis cet appareil.':`${state.tasks.length} jalons proposés pour commencer. Aucun n’est déclaré terminé.`};
 }catch{
  return {state:createInitialProjectState(),notice:'La sauvegarde locale est inaccessible ou invalide. Son contenu n’a pas été modifié. Tu peux exporter les nouveaux jalons avant de quitter.'};
 }
}

export function saveProjectState(state,storage=undefined,ownerId=''){
 try{
  const target=storage??globalThis.localStorage;if(!target?.setItem)throw Error('Stockage absent');
  const key=projectStorageKey(ownerId),previous=target.getItem?.(key);
  if(previous){try{parseProjectBackup(previous);}catch{target.setItem(key+':recovery',previous);}}
  target.setItem(key,JSON.stringify(parseProjectBackup(state)));
  return {ok:true};
 }catch{return {ok:false,notice:'Enregistrement local impossible. Les changements restent dans cette session ; télécharge une sauvegarde JSON avant de quitter.'};}
}

export function applyProjectAction(state,action,now=nowIso()){
 if(action.type==='select'){
  if(!knownProject(action.projectId))throw Error('Projet inconnu.');
  return {...state,selectedProject:action.projectId,updatedAt:now};
 }
 if(action.type==='status'){
  if(!Object.hasOwn(PROJECT_STATUSES,action.status))throw Error('État de jalon inconnu.');
  if(!state.tasks.some(task=>task.id===action.id))throw Error('Jalon introuvable.');
  return {...state,tasks:state.tasks.map(task=>task.id===action.id?{...task,status:action.status,updatedAt:now}:task),updatedAt:now};
 }
 if(action.type==='save'){
  const current=state.tasks.find(task=>task.id===action.task?.id);
  if(!current&&state.tasks.length>=MAX_TASKS)throw Error(`La limite est de ${MAX_TASKS} jalons.`);
  const task=validateTask({...action.task,status:current?.status||action.task.status,createdAt:current?.createdAt||now,updatedAt:now},now);
  if(current&&current.projectId!==task.projectId)throw Error('Le projet du jalon ne peut pas changer.');
  return {...state,tasks:current?state.tasks.map(item=>item.id===task.id?task:item):[...state.tasks,task],updatedAt:now};
 }
 if(action.type==='delete'){
  if(!state.tasks.some(task=>task.id===action.id))throw Error('Jalon introuvable.');
  return {...state,tasks:state.tasks.filter(task=>task.id!==action.id),updatedAt:now};
 }
 throw Error('Action de projet inconnue.');
}

export function projectSummary(tasks,projectId){
 const selected=tasks.filter(task=>!projectId||task.projectId===projectId),done=selected.filter(task=>task.status==='done').length;
 return {total:selected.length,done,blocked:selected.filter(task=>task.status==='blocked').length,active:selected.filter(task=>task.status==='active').length};
}
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
export function searchProjectTasks(tasks,{projectId,query='',status='all'}={}){
 const words=normalized(query).trim().split(/\s+/).filter(Boolean);
 return tasks.filter(task=>(!projectId||task.projectId===projectId)&&(status==='all'||task.status===status)&&words.every(word=>normalized(task.title+' '+task.owner+' '+task.notes).includes(word))).sort((a,b)=>(a.status==='done')-(b.status==='done')||(b.priority==='high')-(a.priority==='high')||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.createdAt.localeCompare(b.createdAt));
}
export function exportProjectBackup(state){return JSON.stringify(parseProjectBackup(state),null,2);}
export function restoreProjectState(current,snapshot,now=nowIso()){
 const restored=parseProjectBackup(snapshot,now),existing=new Map(current.tasks.map(task=>[task.id,task]));
 const contentFields=['projectId','title','status','priority','owner','dueDate','notes','createdAt'];
 return {...restored,updatedAt:now,tasks:restored.tasks.map(task=>{
  const previous=existing.get(task.id),changed=!previous||contentFields.some(field=>previous[field]!==task[field]);
  return {...task,updatedAt:changed?now:previous.updatedAt};
 })};
}
export function mergeProjectBackup(state,source,now=nowIso()){
 const imported=parseProjectBackup(source,now),tasks=new Map(state.tasks.map(task=>[task.id,task]));let added=0,updated=0;
 for(const task of imported.tasks){
  const previous=tasks.get(task.id);
  if(previous&&previous.projectId!==task.projectId)throw Error('Un identifiant appartient déjà à un autre projet.');
  if(!previous){tasks.set(task.id,task);added++;}
  else if(task.updatedAt>previous.updatedAt){tasks.set(task.id,task);updated++;}
 }
 if(tasks.size>MAX_TASKS)throw Error(`La fusion dépasserait ${MAX_TASKS} jalons.`);
 return {state:{...state,tasks:[...tasks.values()],updatedAt:now},added,updated};
}
