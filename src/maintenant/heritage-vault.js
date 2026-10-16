// Héritage 3B — optional local encrypted memory book, isolated from Health and Passport.
// No request, cloud sync, analytics event or external provider is used.
export const HERITAGE_VAULT_KEY='threeb_heritage_vault_v1';
export const HERITAGE_ITERATIONS=600000;
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const MAX_ENTRIES=40;
const MAX_LENGTH=3000;

function cryptoProvider(){
 if(!globalThis.crypto?.subtle||(typeof window!=='undefined'&&!window.isSecureContext))throw Error('Coffre indisponible : HTTPS ou navigateur compatible requis.');
 return globalThis.crypto;
}
function encode64(data){
 const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
 let s='';
 for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(s);
}
function decode64(value,max){
 if(typeof value!=='string'||value.length<4||value.length>max||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Sauvegarde chiffrée illisible.');
 try{return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}catch{throw Error('Sauvegarde chiffrée illisible.');}
}
export function validateHeritageEntries(data){
 if(!Array.isArray(data)||data.length>MAX_ENTRIES)throw Error('Journal invalide ou trop volumineux.');
 return data.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||!/^[-a-z0-9]{8,72}$/i.test(row.id))throw Error('Entrée de journal invalide.');
  const title=typeof row.title==='string'?row.title.trim():'';
  const story=typeof row.story==='string'?row.story.trim():'';
  if(!title||title.length>100||!story||story.length>MAX_LENGTH)throw Error('Texte de journal invalide.');
  const created=typeof row.created==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.created)?row.created:'';
  if(!created)throw Error('Date de journal invalide.');
  return {id:row.id,title,story,created};
 });
}
export function validateHeritageEnvelope(raw){
 let envelope=raw;
 if(typeof raw==='string'&&raw.length<=250000){try{envelope=JSON.parse(raw);}catch{throw Error('Sauvegarde chiffrée illisible.');}}
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
 envelope.version!==1||envelope.algorithm!=='AES-256-GCM'||
 envelope.kdf!=='PBKDF2-SHA-256'||envelope.iterations!==HERITAGE_ITERATIONS)throw Error('Format de coffre non reconnu.');
 const salt=decode64(envelope.salt,28),iv=decode64(envelope.iv,20),ciphertext=decode64(envelope.ciphertext,200000);
 if(salt.length!==16||iv.length!==12||ciphertext.length<17)throw Error('Sauvegarde chiffrée illisible.');
 return {envelope:{version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA-256',iterations:HERITAGE_ITERATIONS,salt:envelope.salt,iv:envelope.iv,ciphertext:envelope.ciphertext},salt,iv,ciphertext};
}
async function keyFor(passphrase,salt){
 if(typeof passphrase!=='string'||passphrase.length<12)throw Error('Phrase secrète de 12 caractères minimum requise.');
 const source=await cryptoProvider().subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return cryptoProvider().subtle.deriveKey(
  {name:'PBKDF2',salt,iterations:HERITAGE_ITERATIONS,hash:'SHA-256'},
  source,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealHeritage(entries,key,saltText){
 const data=validateHeritageEntries(entries);
 const salt=decode64(saltText,28);
 if(salt.length!==16)throw Error('Paramètres cryptographiques incorrects.');
 const iv=cryptoProvider().getRandomValues(new Uint8Array(12));
 const ciphertext=await cryptoProvider().subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify({version:1,entries:data})));
 return {version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA-256',iterations:HERITAGE_ITERATIONS,salt:saltText,iv:encode64(iv),ciphertext:encode64(ciphertext)};
}
export async function createHeritageVault(passphrase,entries=[]){
 const salt=cryptoProvider().getRandomValues(new Uint8Array(16));
 const key=await keyFor(passphrase,salt);
 const envelope=await sealHeritage(entries,key,encode64(salt));
 return {key,envelope};
}
export async function openHeritageVault(raw,passphrase){
 const {envelope,salt,iv,ciphertext}=validateHeritageEnvelope(raw);
 const key=await keyFor(passphrase,salt);
 try {
  const bytes=await cryptoProvider().subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
  const data=JSON.parse(decoder.decode(bytes));
  if(!data||data.version!==1)throw Error('Invalid vault body.');
  const entries=validateHeritageEntries(data.entries);
  return {key,entries,envelope};
 }catch{
  throw Error('Phrase secrète incorrecte ou coffre endommagé. Aucune donnée modifiée.');
 }
}
