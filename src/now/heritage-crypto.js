export const HERITAGE_VERSION=1;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const AAD=encoder.encode('3b-heritage-personal-v1');
const ITERATIONS=310000;
function bytesToBase64(bytes){
 let out='';
 for(const x of bytes)out+=String.fromCharCode(x);
 return btoa(out);
}
function base64ToBytes(text){
 if(typeof text!=='string'||!text||text.length>1500000)throw Error('Sauvegarde invalide.');
 const decoded=atob(text);
 return Uint8Array.from(decoded,x=>x.charCodeAt(0));
}
export function isEncryptedVault(value){
 return !!value&&value.v===HERITAGE_VERSION&&typeof value.salt==='string'&&typeof value.iv==='string'&&typeof value.cipher==='string'&&value.cipher.length<1500000;
}
export function validateHeritageStories(value){
 if(!Array.isArray(value)||value.length>80)throw Error('Le carnet ne peut pas être chargé.');
 return value.map(x=>{
  if(!x||typeof x.id!=='string'||!/^[-\w]{1,90}$/.test(x.id)||typeof x.title!=='string'||typeof x.body!=='string'||x.title.length>100||x.body.length>5000)throw Error('Une entrée du carnet est invalide.');
  return {id:x.id,title:x.title,body:x.body,date:typeof x.date==='string'&&x.date.length<48?x.date:''};
 });
}
async function vaultKey(phrase,salt,cryptoApi){
 const secret=await cryptoApi.subtle.importKey('raw',encoder.encode(phrase),'PBKDF2',false,['deriveKey']);
 return cryptoApi.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},secret,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptHeritage(stories,phrase,cryptoApi=globalThis.crypto){
 if(typeof phrase!=='string'||phrase.length<12)throw Error('Choisis une phrase secrète d’au moins 12 caractères.');
 if(!cryptoApi?.subtle||!cryptoApi.getRandomValues)throw Error('Chiffrement indisponible sur cet appareil.');
 const data=JSON.stringify(validateHeritageStories(stories));
 if(data.length>300000)throw Error('Le carnet est trop volumineux.');
 const salt=cryptoApi.getRandomValues(new Uint8Array(16)),iv=cryptoApi.getRandomValues(new Uint8Array(12));
 const key=await vaultKey(phrase,salt,cryptoApi);
 const cipher=await cryptoApi.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},key,encoder.encode(data));
 return {v:HERITAGE_VERSION,salt:bytesToBase64(salt),iv:bytesToBase64(iv),cipher:bytesToBase64(new Uint8Array(cipher))};
}
export async function decryptHeritage(payload,phrase,cryptoApi=globalThis.crypto){
 if(!isEncryptedVault(payload))throw Error('Le format du carnet est invalide.');
 if(!cryptoApi?.subtle)throw Error('Chiffrement indisponible sur cet appareil.');
 try{
  const salt=base64ToBytes(payload.salt),iv=base64ToBytes(payload.iv),cipher=base64ToBytes(payload.cipher);
  if(salt.length!==16||iv.length!==12)throw Error('Bad key material');
  const key=await vaultKey(String(phrase||''),salt,cryptoApi);
  const plain=await cryptoApi.subtle.decrypt({name:'AES-GCM',iv,additionalData:AAD},key,cipher);
  return validateHeritageStories(JSON.parse(decoder.decode(plain)));
 }catch{throw Error('Phrase secrète incorrecte ou sauvegarde endommagée.')}
}
export function heritageStorageKey(uid){
 return 'threeb-heritage-encrypted-v1-'+(typeof uid==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(uid)?uid:'visiteur');
}
