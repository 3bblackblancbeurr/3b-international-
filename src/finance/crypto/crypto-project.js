export * from '../../../crypto-prototype/lib/project-config.js';
import {newCryptoProject,normalizeCryptoProject} from '../../../crypto-prototype/lib/project-config.js';
export const CRYPTO_PROJECT_KEY='threeb_crypto_project_v1';
function decode(raw){if(raw===null)return newCryptoProject();const value=JSON.parse(raw);if(value?.version!==1)throw Error('version');return normalizeCryptoProject(value);}
export function loadCryptoProject(storage){let raw=null;try{raw=(storage??globalThis.localStorage).getItem(CRYPTO_PROJECT_KEY);return {project:decode(raw),raw,warning:''};}catch{return {project:newCryptoProject(),raw,warning:'Dossier local indisponible. Tu peux préparer et exporter un dossier pendant cette session.'};}}
export function saveCryptoProject(project,expectedRaw,storage){const next=normalizeCryptoProject(project);try{const target=storage??globalThis.localStorage,current=target.getItem(CRYPTO_PROJECT_KEY),changed=()=>({...loadCryptoProject(target),saved:false,conflict:true,warning:'Le dossier enregistré a changé pendant la sauvegarde.'});if(current!==expectedRaw)return changed();let recovery=false;try{decode(current);}catch{recovery=true;}if(target.getItem(CRYPTO_PROJECT_KEY)!==current)return changed();if(recovery)target.setItem(CRYPTO_PROJECT_KEY+'_recovery',current);const raw=JSON.stringify(next);if(target.getItem(CRYPTO_PROJECT_KEY)!==current)return changed();target.setItem(CRYPTO_PROJECT_KEY,raw);return {project:next,raw,saved:true,conflict:false,warning:''};}catch{return {project:next,raw:expectedRaw,saved:false,conflict:false,warning:'Le dossier reste dans cette session. Exporte le manifeste pour le conserver.'};}}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const conflict=()=>Object.assign(Error('Un champ modifié a changé dans un autre onglet. Ton brouillon reste affiché ; exporte-le avant de recharger le dossier enregistré.'),{conflict:true});
export function applyCryptoProjectDraft(latest,baseline,next,{replace=false}={}){
 const current=normalizeCryptoProject(latest),before=normalizeCryptoProject(baseline),draft=normalizeCryptoProject(next);
 if(replace){if(!equal(current,before))throw conflict();return draft;}
 for(const key of ['title','purpose','supplyTokens','recipient','network','organisation','lead','reviewer'])if(draft[key]!==before[key]){if(current[key]!==before[key]&&current[key]!==draft[key])throw conflict();current[key]=draft[key];}
 for(const id of Object.keys(current.evidence))for(const key of ['reference','reviewer','date'])if(draft.evidence[id][key]!==before.evidence[id][key]){if(current.evidence[id][key]!==before.evidence[id][key]&&current.evidence[id][key]!==draft.evidence[id][key])throw conflict();current.evidence[id][key]=draft.evidence[id][key];}
 return current;
}
export function createCryptoProjectSession({storage,locks=globalThis.navigator?.locks}={}){
 const loaded=loadCryptoProject(storage);let current=loaded.project,queue=Promise.resolve(),failure=null;
 return {loaded,getState:()=>current,commit({baseline,next,replace=false}){
  const execute=()=>{if(failure)return {...failure,project:current};const latest=loadCryptoProject(storage);try{const merged=applyCryptoProjectDraft(latest.project,baseline,next,{replace}),result=saveCryptoProject(merged,latest.raw,storage);if(result.saved)current=result.project;else{current=result.conflict?result.project:latest.project;failure=result;}return result;}catch(error){failure={saved:false,conflict:error.conflict===true,raw:latest.raw,warning:error.message||'Sauvegarde impossible. Exporte ton brouillon avant de recharger.'};current=latest.project;return {...failure,project:current};}};
  const result=queue.catch(()=>{}).then(()=>locks?.request?locks.request(CRYPTO_PROJECT_KEY,execute):execute()).catch(()=>{failure={saved:false,conflict:false,warning:'Sauvegarde indisponible. Ton brouillon reste affiché ; exporte-le avant de recharger.'};return {...failure,project:current};});queue=result;return result;
 }};
}
