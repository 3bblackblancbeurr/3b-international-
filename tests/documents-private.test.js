import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVaultEnvelope,unlockVaultEnvelope,sealVaultPayload,exportEncryptedVault,parseEncryptedVault,validateVaultEnvelope,VAULT_KDF_ITERATIONS} from '../src/documents-private/vault-crypto.js';
import {addVaultDocument,documentBytesForExport,DOCUMENT_LIMITS,editVaultDocument,newVaultPayload,permanentlyRemoveVaultDocument,saveVaultRequest,trashVaultDocument,validateDocumentFile,validateVaultPayload} from '../src/documents-private/vault-model.js';
import {createPrivateVaultSession} from '../src/documents-private/vault-session.js';
import {createVaultStorage} from '../src/documents-private/vault-storage.js';
import {PUBLIC_SERVICES,publicServiceCapabilities,preparePublicServiceRequest,submitPublicServiceRequest} from '../src/documents-private/public-service-adapters.js';

const A='a1000000-0000-4000-8000-000000000001',B='b2000000-0000-4000-8000-000000000002';
const PASSWORD='mot-de-passe-de-recette-uniquement';
const fixtureBytes=new TextEncoder().encode('%PDF-1.7\nDocument synthétique sans donnée personnelle.\n%%EOF');
const file=()=>({name:'papier-synthetique.pdf',mime:'application/pdf',bytes:fixtureBytes,category:'taxes',notes:'Note de recette privée',caseId:'case-synthetic',expires:'2027-10-18'});
const clone=value=>structuredClone(value);
function memoryStore(){const values=new Map();let failing=false;return{values,setFailure:value=>{failing=value;},async read(id){return clone(values.get(id)??null);},async remove(id,expected){if(failing)throw Error('Stockage indisponible');if((values.get(id)?.revision??null)!==expected)throw Object.assign(Error('Conflit simulé'),{code:'vault_conflict'});values.delete(id);},async write(id,expected,next){if(failing)throw Error('Quota simulé');if((values.get(id)?.revision??null)!==expected)throw Object.assign(Error('Conflit simulé'),{code:'vault_conflict'});values.set(id,clone(next));return clone(next);}};}

test('AES-GCM encrypts files AND metadata, PBKDF2 uses a random salt, key is nonextractable',async()=>{
 const payload=await addVaultDocument(newVaultPayload(),file());const {key,envelope}=await createVaultEnvelope(A,PASSWORD,payload),raw=exportEncryptedVault(envelope,A);
 assert.equal(envelope.kdf.iterations,600000);assert.equal(VAULT_KDF_ITERATIONS,600000);assert.equal(key.extractable,false);await assert.rejects(crypto.subtle.exportKey('raw',key));
 for(const secret of [PASSWORD,'papier-synthetique.pdf','Note de recette privée','taxes','case-synthetic','2027-10-18'])assert.equal(raw.includes(secret),false);
 const opened=await unlockVaultEnvelope(A,PASSWORD,envelope);assert.deepEqual(opened.payload,payload);
 const exported=await documentBytesForExport(opened.payload,payload.documents[0].id);assert.deepEqual(exported.bytes,fixtureBytes);assert.equal(exported.name,file().name);
});

test('wrong passwords and ciphertext/header tampering never decrypt or replace content',async()=>{
 const {envelope}=await createVaultEnvelope(A,PASSWORD,newVaultPayload());
 await assert.rejects(unlockVaultEnvelope(A,'autre-mot-de-passe-de-recette',envelope),/incorrect ou coffre endommagé/);
 for(const mutate of [value=>value.ciphertext=(value.ciphertext[0]==='A'?'B':'A')+value.ciphertext.slice(1),value=>value.cipher.iv=(value.cipher.iv[0]==='A'?'B':'A')+value.cipher.iv.slice(1),value=>value.revision=crypto.randomUUID(),value=>value.kdf.iterations++]){const changed=clone(envelope);mutate(changed);await assert.rejects(unlockVaultEnvelope(A,PASSWORD,changed),/incorrect ou coffre endommagé/);}
});

test('account binding prevents cross-account restore and AAD rebinding with the same password',async()=>{
 const {envelope}=await createVaultEnvelope(A,PASSWORD,newVaultPayload());
 assert.throws(()=>parseEncryptedVault(JSON.stringify(envelope),B),/autre compte/);await assert.rejects(unlockVaultEnvelope(B,PASSWORD,envelope),/autre compte/);
 await assert.rejects(unlockVaultEnvelope(B,PASSWORD,{...envelope,ownerId:B}),/incorrect ou coffre endommagé/);
});

test('JSON backup object-key ordering does not change authenticated header semantics',async()=>{
 const {envelope}=await createVaultEnvelope(A,PASSWORD,newVaultPayload());const reordered={ciphertext:envelope.ciphertext,cipher:{iv:envelope.cipher.iv,name:envelope.cipher.name},kdf:{salt:envelope.kdf.salt,iterations:envelope.kdf.iterations,hash:envelope.kdf.hash,name:envelope.kdf.name},revision:envelope.revision,ownerId:A,version:envelope.version,format:envelope.format};
 assert.deepEqual((await unlockVaultEnvelope(A,PASSWORD,parseEncryptedVault(JSON.stringify(reordered),A))).payload,newVaultPayload());
});

test('20 MiB capacity includes trash and rejects further files without changing prior state',async()=>{
 const bytes=new Uint8Array(DOCUMENT_LIMITS.fileBytes);bytes.set(new TextEncoder().encode('%PDF-'));let payload=newVaultPayload();
 for(let i=0;i<4;i++)payload=await addVaultDocument(payload,{name:'capacite-'+i+'.pdf',mime:'application/pdf',bytes});
 assert.equal(payload.documents.reduce((total,row)=>total+row.size,0),DOCUMENT_LIMITS.totalBytes);
 const trashed=trashVaultDocument(payload,payload.documents[0].id);await assert.rejects(addVaultDocument(trashed,file()),/20 Mio.*corbeille/);assert.equal(trashed.documents.length,4);
 const freed=permanentlyRemoveVaultDocument(trashed,trashed.documents[0].id);assert.equal((await addVaultDocument(freed,file())).documents.length,4);
});

test('every save uses a fresh IV/revision and envelope parameters reject resource abuse',async()=>{
 const first=await createVaultEnvelope(A,PASSWORD,newVaultPayload()),second=await sealVaultPayload(A,first.key,newVaultPayload(),first.envelope.kdf);
 assert.notEqual(first.envelope.cipher.iv,second.cipher.iv);assert.notEqual(first.envelope.revision,second.revision);assert.notEqual(first.envelope.ciphertext,second.ciphertext);
 for(const kdf of [{...first.envelope.kdf,iterations:1},{...first.envelope.kdf,iterations:2000001},{...first.envelope.kdf,salt:'invalid'}])assert.throws(()=>validateVaultEnvelope({...first.envelope,kdf},A));
 await assert.rejects(createVaultEnvelope(A,'court',newVaultPayload()),/12 à 256/);await assert.rejects(createVaultEnvelope('guest',PASSWORD,newVaultPayload()),/compte membre/);
});

test('strict file format, size, date and binary limits reject unsafe or inconsistent inputs',async()=>{
 for(const [name,mime,bytes] of [['piece.html','text/html',new TextEncoder().encode('<script>')],['faux.pdf','application/pdf',new Uint8Array([1,2,3])],['../piece.pdf','application/pdf',fixtureBytes],['vide.pdf','application/pdf',new Uint8Array()],['gros.pdf','application/pdf',new Uint8Array(DOCUMENT_LIMITS.fileBytes+1)],['binary.txt','text/plain',new Uint8Array([255])]])assert.throws(()=>validateDocumentFile(name,mime,bytes));
 const value=await addVaultDocument(newVaultPayload(),file());assert.throws(()=>editVaultDocument(value,value.documents[0].id,{expires:'2026-02-30'}));
 assert.throws(()=>validateVaultPayload({...value,documents:[{...value.documents[0],size:1}]}));
 assert.throws(()=>validateVaultPayload({...value,documents:[value.documents[0],value.documents[0]]}));
});

test('corbeille is reversible; permanent deletion requires trash and updates request attachments',async()=>{
 let payload=await addVaultDocument(newVaultPayload(),file());const id=payload.documents[0].id;
 payload=saveVaultRequest(payload,{title:'Demande synthétique',serviceId:'taxes',documentIds:[id]});
 assert.throws(()=>permanentlyRemoveVaultDocument(payload,id),/corbeille/);
 const trashed=trashVaultDocument(payload,id);assert.ok(trashed.documents[0].deletedAt);await assert.rejects(documentBytesForExport(trashed,id),/pas disponible/);
 assert.equal(trashVaultDocument(trashed,id,true).documents[0].deletedAt,null);
 const deleted=permanentlyRemoveVaultDocument(trashed,id);assert.equal(deleted.documents.length,0);assert.deepEqual(deleted.requests[0].documentIds,[]);assert.equal(deleted.requests[0].status,'draft');
});

test('stored records contain only the envelope; restarting requires the password and preserves bytes',async()=>{
 const storage=memoryStore(),session=createPrivateVaultSession(A,{storage});assert.equal((await session.inspect()).exists,false);
 assert.equal((await session.create(PASSWORD)).saved,true);await session.update(payload=>addVaultDocument(payload,file()));
 const raw=JSON.stringify(storage.values.get(A));assert.equal(raw.includes(file().name),false);assert.equal(raw.includes(PASSWORD),false);assert.equal(raw.includes('Note de recette'),false);
 session.dispose();assert.equal(session.snapshot().payload,null);const resumed=createPrivateVaultSession(A,{storage});assert.equal(resumed.snapshot().unlocked,false);
 await resumed.unlock(PASSWORD);assert.equal(resumed.snapshot().payload.documents[0].name,file().name);
 const other=createPrivateVaultSession(B,{storage});assert.equal((await other.inspect()).exists,false);await assert.rejects(other.unlock(PASSWORD),/Aucun coffre/);
});

test('failed storage keeps changes and encrypted recovery across lock; next successful update includes prior unsaved edits',async()=>{
 const storage=memoryStore(),session=createPrivateVaultSession(A,{storage});await session.create(PASSWORD);const original=clone(storage.values.get(A));storage.setFailure(true);
 const failed=await session.update(payload=>addVaultDocument(payload,file()));assert.equal(failed.saved,false);assert.equal(failed.dirty,true);assert.deepEqual(storage.values.get(A),original);
 session.lock();assert.equal(session.snapshot().unlocked,false);assert.equal(session.snapshot().payload,null);assert.equal(session.snapshot().dirty,true);
 const backup=await session.encryptedBackup(),opened=await unlockVaultEnvelope(A,PASSWORD,parseEncryptedVault(backup,A));assert.equal(opened.payload.documents.length,1);
 await session.unlock(PASSWORD);assert.equal(session.snapshot().dirty,true);storage.setFailure(false);
 const id=session.snapshot().payload.documents[0].id;const saved=await session.update(payload=>editVaultDocument(payload,id,{notes:'Modification B après échec A'}));assert.equal(saved.saved,true);
 const restored=await unlockVaultEnvelope(A,PASSWORD,storage.values.get(A));assert.equal(restored.payload.documents.length,1);assert.equal(restored.payload.documents[0].notes,'Modification B après échec A');
});

test('two sessions cannot silently overwrite the encrypted vault and retain a conflicted backup',async()=>{
 const storage=memoryStore(),a=createPrivateVaultSession(A,{storage});await a.create(PASSWORD);const b=createPrivateVaultSession(A,{storage});await b.unlock(PASSWORD);
 const first=await a.update(payload=>addVaultDocument(payload,file()));assert.equal(first.saved,true);
 const second=await b.update(payload=>saveVaultRequest(payload,{title:'Brouillon B',serviceId:'france-travail'}));assert.equal(second.saved,false);assert.equal(second.conflict,true);
 const stored=await unlockVaultEnvelope(A,PASSWORD,storage.values.get(A));assert.equal(stored.payload.documents.length,1);assert.equal(stored.payload.requests.length,0);
 const bBackup=await unlockVaultEnvelope(A,PASSWORD,parseEncryptedVault(await b.encryptedBackup(),A));assert.equal(bBackup.payload.requests[0].title,'Brouillon B');
});

test('session disposal cancels pending work; corrupt storage is never silently replaced',async()=>{
 let release;const delayed={read:()=>new Promise(resolve=>{release=resolve;}),write:()=>assert.fail()};const session=createPrivateVaultSession(A,{storage:delayed});const pending=session.create(PASSWORD);session.dispose();release(null);await assert.rejects(pending,/session.*changé/);assert.equal(session.snapshot().payload,null);
 const storage=memoryStore();storage.values.set(A,{ownerId:A,revision:'broken',format:'bad'});const broken=createPrivateVaultSession(A,{storage});await assert.rejects(broken.inspect());await assert.rejects(broken.create(PASSWORD),/existe déjà/);assert.equal(storage.values.get(A).format,'bad');
 await assert.rejects(createVaultStorage().read(A),/indisponible/);
});

test('encrypted restore is account-bound, password-protected and requires replacement confirmation',async()=>{
 const sourceStore=memoryStore(),source=createPrivateVaultSession(A,{storage:sourceStore});await source.create(PASSWORD);await source.update(payload=>addVaultDocument(payload,file()));const backup=await source.encryptedBackup();
 const destinationStore=memoryStore(),destination=createPrivateVaultSession(A,{storage:destinationStore});assert.equal((await destination.importBackup(backup,PASSWORD)).saved,true);assert.equal(destination.snapshot().payload.documents.length,1);
 await assert.rejects(destination.importBackup(backup,PASSWORD),/Confirme le remplacement/);
 const before=clone(destinationStore.values.get(A));await assert.rejects(destination.importBackup(backup,'mauvais-mot-de-passe-123',{replaceConfirmed:true}));assert.deepEqual(destinationStore.values.get(A),before);
 await assert.rejects(createPrivateVaultSession(B,{storage:destinationStore}).importBackup(backup,PASSWORD,{replaceConfirmed:true}),/autre compte/);
});

test('public-service adapters remain inert and carry no documents or pretended official result',async()=>{
 for(const serviceId of Object.keys(PUBLIC_SERVICES)){const caps=publicServiceCapabilities(serviceId);assert.equal(caps.canRead,false);assert.equal(caps.canSend,false);assert.equal(caps.status,'not_connected');assert.ok(caps.officialUrl.startsWith('https://'));const plan=preparePublicServiceRequest(serviceId,{documentIds:['private-1']});assert.equal(plan.payload,null);assert.equal(plan.documentCount,1);assert.equal(plan.operation,'user-preparation-only');}
 await assert.rejects(submitPublicServiceRequest(),/aucun envoi ni lecture/);
 for(const name of ['vault-crypto.js','vault-storage.js','vault-model.js','vault-session.js','public-service-adapters.js'])assert.doesNotMatch(readFileSync(new URL('../src/documents-private/'+name,import.meta.url),'utf8'),/\bfetch\s*\(|localStorage|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
});

test('whole-vault deletion requires unlocked explicit confirmation and cannot delete another account',async()=>{
 const storage=memoryStore(),a=createPrivateVaultSession(A,{storage}),b=createPrivateVaultSession(B,{storage});await a.create(PASSWORD);await b.create(PASSWORD);
 await assert.rejects(a.erase(),/confirme explicitement/);assert.ok(storage.values.has(A));
 storage.setFailure(true);await assert.rejects(a.erase({confirmed:true}),/indisponible/);assert.equal(a.snapshot().unlocked,true);assert.ok(storage.values.has(A));storage.setFailure(false);
 const result=await a.erase({confirmed:true});assert.equal(result.erased,true);assert.equal(result.unlocked,false);assert.equal(storage.values.has(A),false);assert.equal(storage.values.has(B),true);
 await assert.rejects(a.erase({confirmed:true}),/Déverrouille/);
});
