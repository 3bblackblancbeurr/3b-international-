import {COUNTRY_INDEX,countryFor} from '../memberSources.js';

export const TRAVEL_STORAGE_KEY='threeb_travel_notebook_v1';
export const TRAVEL_LIMITS=Object.freeze({trips:30,steps:60,checks:60});
export const TRAVEL_MAX_BYTES=12000000;
export const TRAVEL_ADVICE_URL='https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs';
export const PREPARATION_TEMPLATE=Object.freeze([
  'Consulter les conseils officiels pour ma destination',
  'Vérifier les conditions de transport',
  'Préparer mon hébergement',
  'Organiser mes étapes et mon budget',
  'Prévoir mes contacts utiles hors ligne',
]);
const SCHEMA='3b-travel-notebook';
const nowIso=()=>new Date().toISOString();
const fail=message=>{throw Error(message);};
const newId=()=>globalThis.crypto?.randomUUID?.()||'trip-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const id=value=>typeof value==='string'&&/^[-a-zA-Z0-9_]{1,100}$/.test(value);
const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():fail('Date de sauvegarde invalide.');
const clean=(value,max,label,required=false)=>{
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(label+' invalide.');
  const result=value.trim();if(required&&!result)fail('Renseigne '+label.toLocaleLowerCase('fr')+'.');return result;
};
export function validTravelDate(value){return typeof value==='string'&&(value===''||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value));}
export function parseTravelCost(value){
  const source=String(value??'').trim().replace(',','.');
  if(source==='')return 0;
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(source))return null;
  const [whole,fraction='']=source.split('.');const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(minor)&&minor<=100000000?minor:null;
}
export const formatTravelCost=minor=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(minor/100);
export const formatTravelDate=date=>date?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Date à définir';

export function emptyTravelState(){return {schema:SCHEMA,version:1,revision:0,selectedId:'',trips:[],updatedAt:'1970-01-01T00:00:00.000Z'};}
export function createTravelTrip(country='FR',{tripId=newId(),now=nowIso()}={}){
  return {id:tripId,title:'',country:COUNTRY_INDEX.some(item=>item[0]===country)?country:'FR',startDate:'',endDate:'',notes:'',steps:[],checklist:PREPARATION_TEMPLATE.map((title,index)=>({id:'preparation-'+index,title,done:false})),createdAt:now,updatedAt:now};
}
export function createTravelStep({stepId=newId()}={}){return {id:stepId,title:'',place:'',date:'',notes:'',estimatedMinor:0};}

function normalizeStep(raw,trip){
  if(!raw||!id(raw.id))fail('Identifiant d’étape invalide.');
  if(!validTravelDate(raw.date))fail('Date d’étape invalide.');
  if(raw.date&&((trip.startDate&&raw.date<trip.startDate)||(trip.endDate&&raw.date>trip.endDate)))fail('La date de chaque étape doit rester entre le départ et le retour du voyage.');
  if(!Number.isSafeInteger(raw.estimatedMinor)||raw.estimatedMinor<0||raw.estimatedMinor>100000000)fail('Budget d’étape invalide.');
  return {id:raw.id,title:clean(raw.title,120,'Un titre pour cette étape',true),place:clean(raw.place,120,'Lieu'),date:raw.date,notes:clean(raw.notes,800,'Notes d’étape'),estimatedMinor:raw.estimatedMinor};
}
function normalizeTrip(raw){
  if(!raw||!id(raw.id)||!COUNTRY_INDEX.some(item=>item[0]===raw.country))fail('Voyage ou destination invalide.');
  if(!validTravelDate(raw.startDate)||!validTravelDate(raw.endDate))fail('Dates du voyage invalides.');
  if(raw.startDate&&raw.endDate&&raw.endDate<raw.startDate)fail('La date de retour doit suivre ou correspondre à la date de départ.');
  if(!Array.isArray(raw.steps)||raw.steps.length>TRAVEL_LIMITS.steps||!Array.isArray(raw.checklist)||raw.checklist.length>TRAVEL_LIMITS.checks)fail('Un carnet accepte au maximum 60 étapes et 60 préparatifs.');
  const trip={id:raw.id,title:clean(raw.title,100,'Un nom pour ce voyage',true),country:raw.country,startDate:raw.startDate,endDate:raw.endDate,notes:clean(raw.notes,1200,'Notes du voyage'),createdAt:stamp(raw.createdAt),updatedAt:stamp(raw.updatedAt)};
  trip.steps=raw.steps.map(step=>normalizeStep(step,trip));
  trip.checklist=raw.checklist.map(check=>{
    if(!check||!id(check.id)||typeof check.done!=='boolean')fail('Préparatif invalide.');
    return {id:check.id,title:clean(check.title,180,'Un préparatif',true),done:check.done};
  });
  for(const list of [trip.steps,trip.checklist])if(new Set(list.map(item=>item.id)).size!==list.length)fail('Le carnet contient des identifiants en double.');
  return trip;
}
export function parseTravelBackup(source){
  if(typeof source==='string'&&(source.length>TRAVEL_MAX_BYTES||new TextEncoder().encode(source).byteLength>TRAVEL_MAX_BYTES))fail('La sauvegarde dépasse 12 Mo.');
  let raw;try{raw=typeof source==='string'?JSON.parse(source):source;}catch{fail('Sauvegarde JSON illisible.');}
  if(!raw||raw.schema!==SCHEMA||raw.version!==1||!Array.isArray(raw.trips)||raw.trips.length>TRAVEL_LIMITS.trips)fail('Utilise une sauvegarde Carnet Voyage 3B version 1 (30 voyages maximum).');
  if(!Number.isSafeInteger(raw.revision)||raw.revision<0||raw.revision>1000000000)fail('Version de sauvegarde invalide.');
  const trips=raw.trips.map(normalizeTrip);
  if(new Set(trips.map(trip=>trip.id)).size!==trips.length)fail('La sauvegarde contient des voyages en double.');
  return {schema:SCHEMA,version:1,revision:raw.revision,selectedId:trips.some(trip=>trip.id===raw.selectedId)?raw.selectedId:trips[0]?.id||'',trips,updatedAt:stamp(raw.updatedAt)};
}

export function applyTravelAction(input,action,now=nowIso()){
  const state=parseTravelBackup(input);let trips=state.trips,selectedId=state.selectedId;
  if(action.type==='select'){
    if(!trips.some(trip=>trip.id===action.id))fail('Voyage introuvable.');selectedId=action.id;
  }else if(action.type==='save-trip'){
    const existing=trips.find(trip=>trip.id===action.trip?.id);
    if(!existing&&trips.length>=TRAVEL_LIMITS.trips)fail('La limite est de 30 carnets. Exporte puis supprime un voyage pour continuer.');
    // A metadata editor cannot overwrite itinerary/checklist edits performed meanwhile.
    const trip=normalizeTrip({...action.trip,steps:existing?.steps||action.trip.steps,checklist:existing?.checklist||action.trip.checklist,createdAt:existing?.createdAt||now,updatedAt:now});
    trips=existing?trips.map(item=>item.id===trip.id?trip:item):[...trips,trip];selectedId=trip.id;
  }else if(action.type==='delete-trip'){
    if(!trips.some(trip=>trip.id===action.id))fail('Voyage introuvable.');
    trips=trips.filter(trip=>trip.id!==action.id);if(selectedId===action.id)selectedId=trips[0]?.id||'';
  }else if(action.type==='restore'){
    const restored=parseTravelBackup(action.source);trips=restored.trips;selectedId=restored.selectedId;
  }else{
    const trip=trips.find(item=>item.id===action.tripId);if(!trip)fail('Voyage introuvable.');
    let next={...trip,updatedAt:now};
    if(action.type==='save-step'){
      const step=normalizeStep(action.step,trip),exists=trip.steps.some(item=>item.id===step.id);
      if(!exists&&trip.steps.length>=TRAVEL_LIMITS.steps)fail('Ce carnet contient déjà 60 étapes.');
      next.steps=exists?trip.steps.map(item=>item.id===step.id?step:item):[...trip.steps,step];
    }else if(action.type==='delete-step'){
      if(!trip.steps.some(item=>item.id===action.id))fail('Étape introuvable.');next.steps=trip.steps.filter(item=>item.id!==action.id);
    }else if(action.type==='toggle-check'){
      if(!trip.checklist.some(item=>item.id===action.id))fail('Préparatif introuvable.');
      next.checklist=trip.checklist.map(item=>item.id===action.id?{...item,done:!item.done}:item);
    }else if(action.type==='add-check'){
      if(trip.checklist.length>=TRAVEL_LIMITS.checks)fail('Ce carnet contient déjà 60 préparatifs.');
      next.checklist=[...trip.checklist,{id:action.id||newId(),title:action.title,done:false}];
    }else if(action.type==='delete-check'){
      if(!trip.checklist.some(item=>item.id===action.id))fail('Préparatif introuvable.');next.checklist=trip.checklist.filter(item=>item.id!==action.id);
    }else fail('Action de voyage inconnue.');
    next=normalizeTrip(next);trips=trips.map(item=>item.id===next.id?next:item);
  }
  return parseTravelBackup({...state,trips,selectedId,revision:state.revision+1,updatedAt:now});
}

export function travelSummary(trip){
  return {completed:trip.checklist.filter(item=>item.done).length,checks:trip.checklist.length,steps:trip.steps.length,estimatedMinor:trip.steps.reduce((total,step)=>total+step.estimatedMinor,0)};
}
export function orderedTravelSteps(trip){return [...trip.steps].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));}
export function readTravelState(storage){
  try{const raw=(storage??globalThis.localStorage).getItem(TRAVEL_STORAGE_KEY);return {state:raw?parseTravelBackup(raw):emptyTravelState(),raw,warning:''};}
  catch{return {state:emptyTravelState(),raw:undefined,warning:'La sauvegarde locale est inaccessible ou invalide. Aucun ancien carnet n’a été modifié ; tes nouveaux essais peuvent rester en mémoire.'};}
}
export function saveTravelState(state,{storage,expectedRaw}={}){
  try{
    const target=storage??globalThis.localStorage,raw=target.getItem(TRAVEL_STORAGE_KEY);
    if(expectedRaw!==undefined&&raw!==expectedRaw)return {ok:false,conflict:true,warning:'Un autre onglet a modifié tes carnets. Recharge la sauvegarde locale avant de continuer.'};
    if(expectedRaw===undefined&&raw){
      let valid=false;try{parseTravelBackup(raw);valid=true;}catch{/* Invalid originals are preserved below. */}
      if(valid)return {ok:false,conflict:true,warning:'Une sauvegarde locale existe déjà. Recharge-la avant de continuer pour conserver tous tes carnets.'};
    }
    if(raw){try{parseTravelBackup(raw);}catch{target.setItem(TRAVEL_STORAGE_KEY+':recovery',raw);}}
    const serialized=JSON.stringify(parseTravelBackup(state));target.setItem(TRAVEL_STORAGE_KEY,serialized);return {ok:true,raw:serialized};
  }catch{return {ok:false,conflict:false,warning:'Enregistrement impossible. Les carnets restent dans cette session : exporte une sauvegarde avant de quitter.'};}
}
export const exportTravelBackup=state=>JSON.stringify(parseTravelBackup(state),null,2);
export function exportTravelText(trip){
  const value=normalizeTrip(trip),summary=travelSummary(value);
  return ['CARNET VOYAGE · 3B INTERNATIONAL',value.title,countryFor(value.country)[1],`Départ : ${formatTravelDate(value.startDate)} · Retour : ${formatTravelDate(value.endDate)}`,'',value.notes,'','MES ÉTAPES',...orderedTravelSteps(value).flatMap((step,index)=>[`${index+1}. ${step.title} · ${formatTravelDate(step.date)}`,step.place,step.notes,`Budget estimé saisi : ${formatTravelCost(step.estimatedMinor)}`,'']),'MES PRÉPARATIFS',...value.checklist.map(item=>`${item.done?'[x]':'[ ]'} ${item.title}`),'',`Budget total estimé saisi : ${formatTravelCost(summary.estimatedMinor)}`,'Ce carnet personnel ne constitue ni une réservation ni une confirmation de conditions d’entrée.',TRAVEL_ADVICE_URL].join('\n');
}
