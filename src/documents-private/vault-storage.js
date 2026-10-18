import {requireVaultOwner,validateVaultEnvelope} from './vault-crypto.js';
const DATABASE='threeb_private_documents_v1',STORE='encrypted_vaults';
const conflict=()=>Object.assign(Error('Le coffre enregistré a changé dans un autre onglet. Exporte ta version chiffrée, puis verrouille et rouvre le coffre pour comparer.'),{code:'vault_conflict'});

export function createVaultStorage(indexedDB=globalThis.indexedDB){
 let opening;
 const open=()=>{
  if(!indexedDB)return Promise.reject(Error('Le stockage sécurisé du navigateur est indisponible. Ne ferme pas sans exporter ta sauvegarde chiffrée.'));
  if(!opening)opening=new Promise((resolve,reject)=>{
   let blocked=false;
   const request=indexedDB.open(DATABASE,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'ownerId'});};
   request.onerror=()=>reject(Error('Le coffre local ne peut pas être ouvert.'));
   request.onblocked=()=>{blocked=true;reject(Error('Ferme les anciennes pages 3B puis réessaie d’ouvrir le coffre.'));};
   request.onsuccess=()=>{const database=request.result;if(blocked){database.close();return;}database.onversionchange=()=>{database.close();opening=null;};resolve(database);};
  }).catch(error=>{opening=null;throw error;});
  return opening;
 };
 return{
  async read(ownerId){requireVaultOwner(ownerId);const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get(ownerId);request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(Error('Lecture du coffre impossible.'));});},
  async remove(ownerId,expectedRevision){
   requireVaultOwner(ownerId);const db=await open();
   return new Promise((resolve,reject)=>{const transaction=db.transaction(STORE,'readwrite'),records=transaction.objectStore(STORE);let failed;const read=records.get(ownerId);read.onsuccess=()=>{if((read.result?.revision??null)!==expectedRevision){failed=conflict();transaction.abort();return;}records.delete(ownerId);};transaction.oncomplete=()=>resolve();transaction.onabort=transaction.onerror=()=>reject(failed||Error('Le coffre n’a pas pu être effacé. Il reste disponible.'));});
  },
  async write(ownerId,expectedRevision,envelope){
   validateVaultEnvelope(envelope,ownerId);const db=await open();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite'),records=transaction.objectStore(STORE);let failed;
    const read=records.get(ownerId);
    read.onsuccess=()=>{if((read.result?.revision??null)!==expectedRevision){failed=conflict();transaction.abort();return;}records.put(envelope);};
    transaction.oncomplete=()=>resolve(envelope);
    transaction.onabort=transaction.onerror=()=>reject(failed||Error('Enregistrement impossible (espace, permission ou stockage). La version en mémoire reste exportable.'));
   });
  }
 };
}
