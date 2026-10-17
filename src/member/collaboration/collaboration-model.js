export const COLLABORATION_SCHEMA='3b-collaboration-studio';
export const COLLABORATION_VERSION=1;
export const COLLABORATION_LIMIT=60;
export const COLLABORATION_STATUSES=Object.freeze({draft:'Brouillon local',ready:'Prêt à relire',contacted:'Contact noté par toi',discussion:'Échange en cours',paused:'En pause',archived:'Archivé'});
export const COLLABORATION_SPACES=Object.freeze({
 association:{label:'Initiatives solidaires',eyebrow:'IMAGINER · RASSEMBLER · AGIR',title:'Une idée qui rapproche.',description:'Prépare une action locale, rassemble les besoins et garde une prochaine étape claire.',singular:'initiative',identity:'Ton collectif ou ton groupe',objective:'Le besoin auquel répondre',proposal:'L’action concrète envisagée',contribution:'Les moyens déjà disponibles',expectations:'Les soutiens à rechercher',audience:'Les personnes concernées',contactLabel:'Personne de contact',templates:[{id:'culture',title:'Rencontre interculturelle',detail:'Imaginer un format où les histoires et les cultures se rencontrent.',type:'Culture & transmission'},{id:'solidarity',title:'Entraide de proximité',detail:'Décrire un besoin local et les moyens utiles pour y répondre.',type:'Entraide locale'},{id:'sport',title:'Sport & lien social',detail:'Préparer une activité accessible et les besoins d’encadrement.',type:'Sport & inclusion'}],checks:[{id:'scope',label:'Le besoin et le public sont décrits sans annoncer d’action déjà organisée.'},{id:'resources',label:'Les moyens, l’encadrement et les autorisations à vérifier sont identifiés.'},{id:'rights',label:'Je partage seulement des informations et contenus que je peux communiquer.'},{id:'review',label:'J’ai relu le projet avant une éventuelle prise de contact.'}]},
 partners:{label:'Atelier collaborations',eyebrow:'PROPOSER · CRÉER · CONSTRUIRE',title:'Une rencontre. Un projet commun.',description:'Transforme ta proposition en brief lisible : les apports de chacun, le public et la prochaine étape.',singular:'proposition',identity:'Ta structure ou ton activité',objective:'L’objectif commun proposé',proposal:'Le format de collaboration',contribution:'Ce que tu peux apporter',expectations:'Ce que tu aimerais construire avec 3B',audience:'Le public ou les usages visés',contactLabel:'Ton nom de contact',templates:[{id:'creation',title:'Création commune',detail:'Une capsule, un contenu ou une expérience à concevoir ensemble.',type:'Création & marque'},{id:'event',title:'Rencontre ou événement',detail:'Un format à proposer, avec ses moyens et ses responsabilités.',type:'Événement & territoire'},{id:'distribution',title:'Diffusion & distribution',detail:'Présenter ton activité, tes canaux et un périmètre de discussion.',type:'Diffusion & distribution'}],checks:[{id:'scope',label:'La proposition distingue clairement mon apport et mes attentes.'},{id:'resources',label:'Le calendrier et les moyens sont indicatifs, sans engagement annoncé.'},{id:'rights',label:'J’ai l’autorisation de présenter les contenus ou la structure cités.'},{id:'review',label:'Je n’annonce aucun partenariat avant un accord réellement conclu.'}]},
 join:{label:'Atelier candidatures',eyebrow:'TES IDÉES · TES TALENTS · TA PLACE',title:'Prépare ta contribution à 3B.',description:'Raconte ce que tu sais faire, le projet qui t’intéresse et la façon dont tu aimerais participer.',singular:'candidature',identity:'Ton activité ou ta spécialité',objective:'Pourquoi tu souhaites contribuer',proposal:'La première contribution que tu proposes',contribution:'Tes compétences et tes expériences',expectations:'Le cadre de participation à discuter',audience:'Le domaine ou le projet 3B qui t’intéresse',contactLabel:'Ton nom ou ton prénom',templates:[{id:'creative',title:'Création & audiovisuel',detail:'Image, mode, récit, musique ou vidéo : présente ton terrain de création.',type:'Création & audiovisuel'},{id:'tech',title:'Tech, jeux & expérience',detail:'Développement, design, 3D ou jeu : propose une contribution ciblée.',type:'Tech & jeux'},{id:'local',title:'Terrain & tests',detail:'Retours d’usage, culture et actions locales : choisis un premier pas.',type:'Terrain & tests'}],checks:[{id:'scope',label:'Mes compétences et la contribution proposée sont précises.'},{id:'resources',label:'Mes disponibilités et le cadre à discuter sont indiqués.'},{id:'rights',label:'Mes références peuvent être partagées ; je ne joins aucun document sensible.'},{id:'review',label:'Je comprends qu’il s’agit d’une candidature spontanée, sans emploi confirmé.'}]},
});
const FIELDS={title:160,type:100,identity:160,objective:1800,audience:700,proposal:1800,contribution:1200,expectations:1000,location:160,timing:240,contactName:100,contactEmail:254,references:500,nextAction:700,followUpDate:10};
const nowIso=()=>new Date().toISOString();
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const clip=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const validId=value=>typeof value==='string'&&/^[-a-zA-Z0-9_]{1,100}$/.test(value);
const validIso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const normalizeIso=(value,fallback)=>validIso(value)?new Date(value).toISOString():fallback;
const dateValid=value=>value===''||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value);
const emailValid=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&!/[\r\n]/.test(value);
export const collaborationStorageKey=ownerId=>'3b-collaboration-v1:'+encodeURIComponent(clean(ownerId,100)||'guest');
export function emptyCollaborationState(now=nowIso()){return {schema:COLLABORATION_SCHEMA,version:COLLABORATION_VERSION,items:[],updatedAt:now};}

export function createCollaborationDraft(space,templateId='',{id=globalThis.crypto?.randomUUID?.()||`draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,now=nowIso()}={}){
 const config=Object.hasOwn(COLLABORATION_SPACES,space)?COLLABORATION_SPACES[space]:null;if(!config||!validId(id))throw Error('Rubrique ou identifiant inconnu.');
 const template=config.templates.find(item=>item.id===templateId);
 return {id,space,...Object.fromEntries(Object.keys(FIELDS).map(field=>[field,''])),title:template?.title||'',type:template?.type||'',status:'draft',checks:Object.fromEntries(config.checks.map(item=>[item.id,false])),activity:[],createdAt:now,updatedAt:now};
}

export function normalizeCollaborationDraft(raw,now=nowIso()){
 if(!raw||!validId(raw.id)||!Object.hasOwn(COLLABORATION_SPACES,raw.space)||!Object.hasOwn(COLLABORATION_STATUSES,raw.status))throw Error('Un brouillon contient une rubrique, un état ou un identifiant invalide.');
 const result={id:raw.id,space:raw.space,...Object.fromEntries(Object.entries(FIELDS).map(([field,max])=>[field,clip(raw[field],max)])),status:raw.status,checks:Object.fromEntries(COLLABORATION_SPACES[raw.space].checks.map(item=>[item.id,raw.checks?.[item.id]===true])),activity:(Array.isArray(raw.activity)?raw.activity:[]).slice(-30).filter(item=>item&&validId(item.id)&&validIso(item.at)).map(item=>({id:item.id,at:new Date(item.at).toISOString(),text:clean(item.text,700)})).filter(item=>item.text),createdAt:normalizeIso(raw.createdAt,now),updatedAt:normalizeIso(raw.updatedAt,now)};
 if(!dateValid(result.followUpDate))throw Error('La date de suivi est invalide.');
 if(result.status==='ready'&&!collaborationReadiness(result).ready)result.status='draft';
 return result;
}

export function collaborationReadiness(draft){
 const config=COLLABORATION_SPACES[draft.space],requirements=[['title','Un titre pour retrouver ton dossier'],['objective',config.objective],['proposal',config.proposal],['contribution',config.contribution],['timing','Tes disponibilités ou ton calendrier'],['contactName',config.contactLabel],['contactEmail','Une adresse de réponse valide']];
 const missing=requirements.filter(([field])=>field==='contactEmail'?!emailValid(draft[field]||''):!clean(draft[field],FIELDS[field]));
 const unchecked=config.checks.filter(item=>draft.checks?.[item.id]!==true);
 return {ready:!missing.length&&!unchecked.length,completed:requirements.length-missing.length+config.checks.length-unchecked.length,total:requirements.length+config.checks.length,missing:missing.map(([field,label])=>({field,label})),unchecked};
}

export function parseCollaborationBackup(input,now=nowIso()){
 if(typeof input==='string'&&input.length>8000000)throw Error('La sauvegarde dépasse 8 Mo.');
 let raw;try{raw=typeof input==='string'?JSON.parse(input):input;}catch{throw Error('Le fichier JSON est illisible.');}
 if(raw?.schema!==COLLABORATION_SCHEMA||raw?.version!==COLLABORATION_VERSION||!Array.isArray(raw.items))throw Error('Utilise une sauvegarde Atelier collaborations 3B version 1.');
 if(raw.items.length>COLLABORATION_LIMIT)throw Error(`La limite est de ${COLLABORATION_LIMIT} brouillons.`);
 const items=raw.items.map(item=>normalizeCollaborationDraft(item,now));
 if(new Set(items.map(item=>item.id)).size!==items.length)throw Error('La sauvegarde contient des identifiants en double.');
 return {schema:COLLABORATION_SCHEMA,version:COLLABORATION_VERSION,items,updatedAt:normalizeIso(raw.updatedAt,now)};
}

export function readCollaborationState(ownerId='',storage=undefined){
 try{const source=(storage??globalThis.localStorage)?.getItem(collaborationStorageKey(ownerId));return {state:source?parseCollaborationBackup(source):emptyCollaborationState(),notice:source?'Tes brouillons ont été retrouvés sur cet appareil.':''};}
 catch{return {state:emptyCollaborationState(),notice:'Le stockage local est inaccessible ou illisible. Les nouveaux brouillons restent dans cette session ; exporte-les avant de quitter.'};}
}
export function saveCollaborationState(state,ownerId='',storage=undefined){
 try{const target=storage??globalThis.localStorage;if(!target?.setItem)throw Error();const key=collaborationStorageKey(ownerId),previous=target.getItem?.(key);if(previous){try{parseCollaborationBackup(previous);}catch{target.setItem(key+':recovery',previous);}}target.setItem(key,JSON.stringify(parseCollaborationBackup(state)));return {ok:true};}
 catch{return {ok:false,notice:'Sauvegarde locale impossible. Exporte le dossier ou la sauvegarde JSON avant de fermer cette page.'};}
}

export function saveCollaborationDraft(state,raw,now=nowIso()){
 const previous=state.items.find(item=>item.id===raw.id);
 if(!previous&&state.items.length>=COLLABORATION_LIMIT)throw Error(`La limite est de ${COLLABORATION_LIMIT} brouillons.`);
 if(previous&&previous.space!==raw.space)throw Error('La rubrique du brouillon ne peut pas changer.');
 let draft=normalizeCollaborationDraft({...raw,createdAt:previous?.createdAt||now,updatedAt:now},now);
 if(draft.status==='ready'&&!collaborationReadiness(draft).ready)draft={...draft,status:'draft'};
 return {...state,items:previous?state.items.map(item=>item.id===draft.id?draft:item):[draft,...state.items],updatedAt:now};
}
export function setCollaborationStatus(state,id,status,now=nowIso()){
 const draft=state.items.find(item=>item.id===id);if(!draft||!Object.hasOwn(COLLABORATION_STATUSES,status))throw Error('Dossier ou état inconnu.');
 if(status==='ready'&&!collaborationReadiness(draft).ready)throw Error('Complète le brief et sa checklist avant de le marquer prêt.');
 if(status===draft.status)return state;
 return saveCollaborationDraft(state,{...draft,status,activity:[...draft.activity,{id:globalThis.crypto?.randomUUID?.()||`status-${Date.now()}-${Math.random().toString(36).slice(2)}`,at:now,text:'Suivi déclaré : '+COLLABORATION_STATUSES[status]}]},now);
}
export function addCollaborationNote(state,id,text,{now=nowIso(),noteId=globalThis.crypto?.randomUUID?.()||`note-${Date.now()}-${Math.random().toString(36).slice(2)}`}={}){
 const draft=state.items.find(item=>item.id===id),note=clean(text,700);if(!draft||!note)throw Error('Ajoute une note de suivi avant de l’enregistrer.');
 return saveCollaborationDraft(state,{...draft,activity:[...draft.activity,{id:noteId,at:now,text:note}]},now);
}
export function deleteCollaborationDraft(state,id,now=nowIso()){
 if(!state.items.some(item=>item.id===id))throw Error('Dossier introuvable.');
 return {...state,items:state.items.filter(item=>item.id!==id),updatedAt:now};
}
export function mergeCollaborationBackup(state,input,now=nowIso()){
 const imported=parseCollaborationBackup(input,now),items=new Map(state.items.map(item=>[item.id,item]));let added=0,updated=0;
 for(const draft of imported.items){const previous=items.get(draft.id);if(previous&&previous.space!==draft.space)throw Error('Un identifiant appartient déjà à une autre rubrique.');if(!previous){items.set(draft.id,draft);added++;}else if(draft.updatedAt>previous.updatedAt){items.set(draft.id,draft);updated++;}}
 if(items.size>COLLABORATION_LIMIT)throw Error(`La fusion dépasserait ${COLLABORATION_LIMIT} dossiers.`);
 return {state:{...state,items:[...items.values()],updatedAt:now},added,updated};
}

export function collaborationText(draft,{includeActivity=false}={}){
 const config=COLLABORATION_SPACES[draft.space];
 const sections=[['Objet',draft.title],['Domaine',draft.type],[config.identity,draft.identity],[config.objective,draft.objective],[config.audience,draft.audience],[config.proposal,draft.proposal],[config.contribution,draft.contribution],[config.expectations,draft.expectations],['Lieu / à distance',draft.location],['Calendrier / disponibilités',draft.timing],['Références ou portfolio',draft.references],['Contact',draft.contactName],['Adresse de réponse',draft.contactEmail]];
 const lines=['3B INTERNATIONAL — '+config.label.toLocaleUpperCase('fr'),'BROUILLON PERSONNEL · AUCUNE TRANSMISSION AUTOMATIQUE','',...sections.filter(([,value])=>clean(value,1800)).map(([label,value])=>label+'\n'+value).flatMap(section=>[section,''])];
 if(includeActivity){lines.push('SUIVI LOCAL DÉCLARÉ : '+COLLABORATION_STATUSES[draft.status]);if(draft.nextAction)lines.push('Prochaine étape : '+draft.nextAction);if(draft.followUpDate)lines.push('Date de suivi : '+draft.followUpDate);for(const item of draft.activity)lines.push(item.at+' — '+item.text);}
 return lines.join('\n').trim()+'\n';
}
export function collaborationMail(draft,recipient){
 if(!emailValid(recipient))throw Error('Adresse destinataire invalide.');
 const label=draft.space==='join'?'Candidature spontanée':draft.space==='partners'?'Proposition de collaboration':'Initiative locale';
 const target=encodeURIComponent(recipient).replace(/%40/gi,'@'),subject=('3B · '+label+' · '+(draft.title||'Mon projet')).replace(/[\r\n]+/g,' '),body=collaborationText(draft),href='mailto:'+target+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 return {subject,body,href,tooLong:href.length>1900,shortHref:'mailto:'+target+'?subject='+encodeURIComponent(subject)};
}
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
export function filterCollaborationDrafts(state,{space,query='',status='all'}={}){
 const words=normalized(query).split(/\s+/).filter(Boolean);
 return state.items.filter(item=>(!space||item.space===space)&&(status==='all'||item.status===status)&&words.every(word=>normalized([item.title,item.identity,item.type,item.objective,item.contactName].join(' ')).includes(word))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export function collaborationDue(draft,today){return Boolean(dateValid(today)&&today&&draft.followUpDate&&draft.followUpDate<=today&&!['archived','paused'].includes(draft.status));}
