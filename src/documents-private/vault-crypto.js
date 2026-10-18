export const VAULT_FORMAT='3b-private-documents';
export const VAULT_VERSION=1;
export const VAULT_KDF_ITERATIONS=600000;
export const VAULT_BACKUP_MAX_BYTES=42*1024*1024;
const MAX_PLAINTEXT_BYTES=30*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encode=new TextEncoder();
const fail=message=>{throw Error(message);};
const cryptoApi=()=>{if(!globalThis.crypto?.subtle)fail('Le chiffrement nécessite un navigateur récent et une connexion HTTPS (ou localhost).');return globalThis.crypto;};
export function requireVaultOwner(ownerId){if(typeof ownerId!=='string'||!UUID.test(ownerId))fail('Connecte-toi à un compte membre pour ouvrir ton coffre.');return ownerId;}
export function bytesToBase64(bytes){if(typeof bytes.toBase64==='function')return bytes.toBase64();let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export function base64ToBytes(value,max=MAX_PLAINTEXT_BYTES+16){
 if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||value.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))fail('Fichier chiffré invalide.');
 let bytes;try{if(typeof Uint8Array.fromBase64==='function')bytes=Uint8Array.fromBase64(value);else{const raw=atob(value);bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);}}catch{fail('Fichier chiffré invalide.');}
 if(bytes.length>max)fail('Fichier chiffré trop volumineux.');return bytes;
}
function passwordBytes(password){if(typeof password!=='string'||password.length<12||password.length>256)fail('Choisis un mot de passe de coffre de 12 à 256 caractères.');return encode.encode(password);}
const header=envelope=>({format:VAULT_FORMAT,version:VAULT_VERSION,ownerId:envelope.ownerId,revision:envelope.revision,kdf:{name:envelope.kdf.name,hash:envelope.kdf.hash,iterations:envelope.kdf.iterations,salt:envelope.kdf.salt}});
const additionalData=envelope=>encode.encode(JSON.stringify(header(envelope)));
export function validateVaultEnvelope(envelope,ownerId){
 requireVaultOwner(ownerId);
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||envelope.format!==VAULT_FORMAT||envelope.version!==VAULT_VERSION)fail('Cette sauvegarde n’est pas un coffre 3B compatible.');
 if(envelope.ownerId!==ownerId)fail('Cette sauvegarde appartient à un autre compte.');
 if(!UUID.test(envelope.revision||'')||envelope.kdf?.name!=='PBKDF2'||envelope.kdf.hash!=='SHA-256'||!Number.isInteger(envelope.kdf.iterations)||envelope.kdf.iterations<VAULT_KDF_ITERATIONS||envelope.kdf.iterations>2000000||envelope.cipher?.name!=='AES-GCM')fail('Paramètres de chiffrement incompatibles.');
 if(base64ToBytes(envelope.kdf.salt,16).length!==16||base64ToBytes(envelope.cipher.iv,12).length!==12||base64ToBytes(envelope.ciphertext).length<16)fail('Fichier chiffré incomplet.');
 return envelope;
}
async function derive(password,kdf){
 const raw=passwordBytes(password);try{
  const material=await cryptoApi().subtle.importKey('raw',raw,{name:'PBKDF2'},false,['deriveKey']);
  return await cryptoApi().subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:kdf.iterations,salt:base64ToBytes(kdf.salt,16)},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }finally{raw.fill(0);}
}
export async function sealVaultPayload(ownerId,key,payload,kdf){
 requireVaultOwner(ownerId);const api=cryptoApi(),plain=encode.encode(JSON.stringify(payload));
 if(plain.length>MAX_PLAINTEXT_BYTES)fail('Le coffre dépasse la capacité de cette version.');
 const envelope={...header({ownerId,revision:api.randomUUID(),kdf:{...kdf}}),cipher:{name:'AES-GCM',iv:bytesToBase64(api.getRandomValues(new Uint8Array(12)))}};
 try{const cipher=await api.subtle.encrypt({name:'AES-GCM',iv:base64ToBytes(envelope.cipher.iv,12),additionalData:additionalData(envelope),tagLength:128},key,plain);return {...envelope,ciphertext:bytesToBase64(new Uint8Array(cipher))};}
 finally{plain.fill(0);}
}
export async function createVaultEnvelope(ownerId,password,payload){
 requireVaultOwner(ownerId);const kdf={name:'PBKDF2',hash:'SHA-256',iterations:VAULT_KDF_ITERATIONS,salt:bytesToBase64(cryptoApi().getRandomValues(new Uint8Array(16)))};
 const key=await derive(password,kdf);return {key,envelope:await sealVaultPayload(ownerId,key,payload,kdf)};
}
export async function unlockVaultEnvelope(ownerId,password,value){
 const envelope=validateVaultEnvelope(value,ownerId),key=await derive(password,envelope.kdf);
 let bytes;
 try{
  bytes=new Uint8Array(await cryptoApi().subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(envelope.cipher.iv,12),additionalData:additionalData(envelope),tagLength:128},key,base64ToBytes(envelope.ciphertext)));
  return {key,payload:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),envelope};
 }catch{fail('Mot de passe incorrect ou coffre endommagé. Aucun document n’a été remplacé.');}
 finally{bytes?.fill(0);}
}
export function exportEncryptedVault(envelope,ownerId){validateVaultEnvelope(envelope,ownerId);return JSON.stringify(envelope);}
export function parseEncryptedVault(source,ownerId){if(typeof source!=='string'||encode.encode(source).length>VAULT_BACKUP_MAX_BYTES)fail('La sauvegarde chiffrée dépasse 42 Mio.');let value;try{value=JSON.parse(source);}catch{fail('Sauvegarde chiffrée JSON illisible.');}return validateVaultEnvelope(value,ownerId);}
