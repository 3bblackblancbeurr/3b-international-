import {createVaultEnvelope,unlockVaultEnvelope,sealVaultPayload,validateVaultEnvelope,exportEncryptedVault,parseEncryptedVault,requireVaultOwner} from './vault-crypto.js';
import {newVaultPayload,validateVaultPayload} from './vault-model.js';
import {createVaultStorage} from './vault-storage.js';
const clone=value=>value===null?null:JSON.parse(JSON.stringify(value));

// A session owns one stable authenticated account ID. No password is retained.
// The UI must discard the instance on sign-out/account change.
export function createPrivateVaultSession(ownerId,{storage=createVaultStorage()}={}){
 requireVaultOwner(ownerId);
 let key=null,payload=null,envelope=null,persistedRevision=null,dirty=false,epoch=0,queue=Promise.resolve();
 const assertEpoch=value=>{if(value!==epoch)throw Error('La session du coffre a changé. Recommence après connexion.');};
 const snapshot=()=>({unlocked:!!key,payload:clone(payload),dirty});
 const save=async(mark,nextEnvelope)=>{
  assertEpoch(mark);envelope=nextEnvelope;
  try{await storage.write(ownerId,persistedRevision,nextEnvelope);assertEpoch(mark);persistedRevision=nextEnvelope.revision;dirty=false;return {saved:true,...snapshot()};}
  catch(error){assertEpoch(mark);dirty=true;return {saved:false,...snapshot(),conflict:error?.code==='vault_conflict',warning:error?.message||'Sauvegarde impossible. Exporte la version chiffrée avant de quitter.'};}
 };
 return{
  snapshot,
  lock(){epoch++;key=null;payload=null;if(!dirty){envelope=null;persistedRevision=null;}},
  dispose(){epoch++;key=null;payload=null;envelope=null;persistedRevision=null;dirty=false;},
  async inspect(){const mark=epoch,current=await storage.read(ownerId);assertEpoch(mark);if(current)validateVaultEnvelope(current,ownerId);return {exists:!!current};},
  async create(password){
   const mark=epoch,current=await storage.read(ownerId);assertEpoch(mark);if(current)throw Error('Un coffre existe déjà pour ce compte. Déverrouille-le pour conserver ses documents.');
   const created=await createVaultEnvelope(ownerId,password,newVaultPayload());assertEpoch(mark);key=created.key;payload=newVaultPayload();persistedRevision=null;dirty=true;return save(mark,created.envelope);
  },
  async unlock(password){
   const mark=epoch,pending=dirty&&envelope,current=pending||await storage.read(ownerId);assertEpoch(mark);if(!current)throw Error('Aucun coffre enregistré pour ce compte sur cet appareil.');
   const opened=await unlockVaultEnvelope(ownerId,password,current),next=validateVaultPayload(opened.payload);assertEpoch(mark);
   key=opened.key;payload=next;envelope=current;if(!pending){persistedRevision=current.revision;dirty=false;}return snapshot();
  },
  update(change){
   const mark=epoch;
   const execute=async()=>{assertEpoch(mark);if(!key||!payload)throw Error('Déverrouille ton coffre avant de modifier les documents.');
    const next=validateVaultPayload(await change(clone(payload)));assertEpoch(mark);payload=next;dirty=true;
    const sealed=await sealVaultPayload(ownerId,key,payload,envelope.kdf);assertEpoch(mark);return save(mark,sealed);
   };
   const result=queue.catch(()=>{}).then(execute);queue=result;return result;
  },
  retry(){return this.update(value=>value);},
  async erase({confirmed=false}={}){if(!key||!confirmed)throw Error('Déverrouille le coffre et confirme explicitement son effacement.');const mark=epoch;await storage.remove(ownerId,persistedRevision);assertEpoch(mark);this.dispose();return {erased:true,...snapshot()};},
  async encryptedBackup(){const mark=epoch;const source=envelope||await storage.read(ownerId);assertEpoch(mark);if(!source)throw Error('Aucun coffre chiffré à exporter.');return exportEncryptedVault(source,ownerId);},
  async importBackup(source,password,{replaceConfirmed=false}={}){
   const mark=epoch,incoming=parseEncryptedVault(source,ownerId),current=await storage.read(ownerId);assertEpoch(mark);
   if(current&&!replaceConfirmed)throw Error('Confirme le remplacement du coffre enregistré après en avoir exporté une copie chiffrée.');
   const opened=await unlockVaultEnvelope(ownerId,password,incoming),next=validateVaultPayload(opened.payload);assertEpoch(mark);
   key=opened.key;payload=next;envelope=incoming;persistedRevision=current?.revision??null;dirty=true;
   // Fresh IV/revision prevents reusing imported ciphertext as a new write.
   const sealed=await sealVaultPayload(ownerId,key,next,incoming.kdf);assertEpoch(mark);return save(mark,sealed);
  }
 };
}
