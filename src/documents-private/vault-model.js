import {base64ToBytes,bytesToBase64} from './vault-crypto.js';
import {PUBLIC_SERVICES,REQUEST_CHECKLIST} from './public-service-adapters.js';
export const DOCUMENT_LIMITS=Object.freeze({fileBytes:5*1024*1024,totalBytes:20*1024*1024,files:40,requests:50});
export const DOCUMENT_CATEGORIES=Object.freeze({identity:'Identité',taxes:'Impôts',employment:'France Travail / emploi',income:'Revenus',housing:'Logement',health:'Santé',other:'Autre'});
export const REQUEST_STATUSES=Object.freeze({draft:'Brouillon privé',prepared:'Préparé, non envoyé',external:'Envoi noté par toi',done:'Résultat noté par toi'});
const fail=message=>{throw Error(message);};
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max,empty=true)=>{if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail('Champ de document invalide ou trop long.');return value.trim();};
const stamp=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)fail('Date du coffre invalide.');return value;};
export function vaultDate(value){if(value==='')return '';if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('Date de validité invalide.');return value;}
export const newVaultPayload=()=>({version:1,documents:[],requests:[]});
export function validateVaultPayload(value){
 if(!record(value)||value.version!==1||!Array.isArray(value.documents)||!Array.isArray(value.requests)||value.documents.length>DOCUMENT_LIMITS.files||value.requests.length>DOCUMENT_LIMITS.requests)fail('Contenu du coffre incompatible ou trop volumineux.');
 const documents=value.documents.map(row=>{
  if(!record(row)||!Number.isSafeInteger(row.size)||row.size<1||row.size>DOCUMENT_LIMITS.fileBytes||!Object.hasOwn(DOCUMENT_CATEGORIES,row.category))fail('Document invalide.');
  const item={id:text(row.id,100,false),name:text(row.name,160,false),mime:text(row.mime,80,false),size:row.size,content:text(row.content,Math.ceil(DOCUMENT_LIMITS.fileBytes/3)*4,false),sha256:text(row.sha256,64,false),category:row.category,expires:vaultDate(row.expires),caseId:text(row.caseId,100),notes:text(row.notes,1000),createdAt:stamp(row.createdAt),updatedAt:stamp(row.updatedAt),deletedAt:row.deletedAt===null?null:stamp(row.deletedAt)};
  if(!/^[0-9a-f]{64}$/.test(item.sha256)||!['application/pdf','image/png','image/jpeg','text/plain'].includes(item.mime)||base64ToBytes(item.content,DOCUMENT_LIMITS.fileBytes).length!==item.size)fail('Contenu de document incompatible.');
  return item;
 });
 if(new Set(documents.map(row=>row.id)).size!==documents.length||documents.reduce((total,row)=>total+row.size,0)>DOCUMENT_LIMITS.totalBytes)fail('Le coffre dépasse 20 Mio ou contient des doublons.');
 const ids=new Set(documents.map(row=>row.id));
 const requests=value.requests.map(row=>{
  if(!record(row)||!Object.hasOwn(PUBLIC_SERVICES,row.serviceId)||!Object.hasOwn(REQUEST_STATUSES,row.status)||!Array.isArray(row.documentIds)||row.documentIds.length>DOCUMENT_LIMITS.files||!Array.isArray(row.checklist)||row.checklist.length!==REQUEST_CHECKLIST.length||row.checklist.some(done=>typeof done!=='boolean')||row.documentIds.some(id=>!ids.has(id))||new Set(row.documentIds).size!==row.documentIds.length)fail('Demande privée invalide.');
  return{id:text(row.id,100,false),title:text(row.title,160,false),serviceId:row.serviceId,status:row.status,caseId:text(row.caseId,100),documentIds:[...row.documentIds],checklist:[...row.checklist],note:text(row.note,1500),createdAt:stamp(row.createdAt),updatedAt:stamp(row.updatedAt)};
 });
 if(new Set(requests.map(row=>row.id)).size!==requests.length)fail('Demandes privées en double.');return{version:1,documents,requests};
}
export function validateDocumentFile(name,mime,bytes){
 if(typeof name!=='string'||!name.trim()||name.length>160||/[\x00-\x1f/\\]/.test(name)||!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>DOCUMENT_LIMITS.fileBytes)fail('Choisis un fichier de 1 octet à 5 Mio, avec un nom simple.');
 const extension=name.split('.').at(-1).toLowerCase(),types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',txt:'text/plain'},type=types[extension];
 if(!type||(mime&&mime!==type))fail('Formats acceptés : PDF, PNG, JPEG et TXT uniquement.');
 const matches=type==='application/pdf'?new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-':type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:true;
 if(!matches)fail('Le contenu du fichier ne correspond pas à son format.');
 if(type==='text/plain')try{const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(decoded.includes('\u0000'))throw Error();}catch{fail('Le fichier TXT doit être un texte UTF-8 valide.');}
 return type;
}
export async function addVaultDocument(payload,{name,mime='',bytes,category='other',expires='',caseId='',notes=''},{now=new Date().toISOString(),id=crypto.randomUUID()}={}){
 const state=validateVaultPayload(payload);if(state.documents.length>=DOCUMENT_LIMITS.files)fail('Le coffre contient déjà 40 fichiers, corbeille comprise.');
 const type=validateDocumentFile(name,mime,bytes);if(state.documents.reduce((n,row)=>n+row.size,0)+bytes.length>DOCUMENT_LIMITS.totalBytes)fail('La capacité de 20 Mio est atteinte, corbeille comprise.');
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const item={id,name:name.trim(),mime:type,size:bytes.length,content:bytesToBase64(bytes),sha256:[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''),category,expires,caseId,notes,createdAt:now,updatedAt:now,deletedAt:null};
 return validateVaultPayload({...state,documents:[item,...state.documents]});
}
export function editVaultDocument(payload,id,patch,now=new Date().toISOString()){
 const state=validateVaultPayload(payload),found=state.documents.some(row=>row.id===id);if(!found)fail('Ce document n’est plus disponible.');
 const allowed=Object.fromEntries(['category','expires','caseId','notes'].filter(key=>Object.hasOwn(patch,key)).map(key=>[key,patch[key]]));
 return validateVaultPayload({...state,documents:state.documents.map(row=>row.id===id?{...row,...allowed,updatedAt:now}:row)});
}
export function trashVaultDocument(payload,id,restore=false,now=new Date().toISOString()){
 const state=validateVaultPayload(payload);return validateVaultPayload({...state,documents:state.documents.map(row=>row.id===id?{...row,deletedAt:restore?null:now,updatedAt:now}:row)});
}
export function permanentlyRemoveVaultDocument(payload,id){
 const state=validateVaultPayload(payload),item=state.documents.find(row=>row.id===id);if(!item?.deletedAt)fail('Place d’abord le document dans la corbeille.');
 return validateVaultPayload({...state,documents:state.documents.filter(row=>row.id!==id),requests:state.requests.map(row=>row.documentIds.includes(id)?{...row,documentIds:row.documentIds.filter(value=>value!==id),status:'draft',checklist:row.checklist.map(()=>false)}:row)});
}
export function saveVaultRequest(payload,draft,{now=new Date().toISOString(),id=crypto.randomUUID()}={}){
 const state=validateVaultPayload(payload),previous=state.requests.find(row=>row.id===(draft.id||id));
 const item={id:previous?.id||id,title:draft.title,serviceId:draft.serviceId,status:draft.status||'draft',caseId:draft.caseId||'',documentIds:draft.documentIds||[],checklist:draft.checklist||REQUEST_CHECKLIST.map(()=>false),note:draft.note||'',createdAt:previous?.createdAt||now,updatedAt:now};
 return validateVaultPayload({...state,requests:previous?state.requests.map(row=>row.id===previous.id?item:row):[item,...state.requests]});
}
export function removeVaultRequest(payload,id){const state=validateVaultPayload(payload);return validateVaultPayload({...state,requests:state.requests.filter(item=>item.id!==id)});}
export async function documentBytesForExport(payload,id){const row=validateVaultPayload(payload).documents.find(item=>item.id===id);if(!row||row.deletedAt)fail('Ce document n’est pas disponible pour export.');const bytes=base64ToBytes(row.content,DOCUMENT_LIMITS.fileBytes),hash=await crypto.subtle.digest('SHA-256',bytes),digest=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==row.sha256)fail('L’intégrité de ce document n’est pas vérifiée.');return {bytes,name:row.name,mime:row.mime};}
