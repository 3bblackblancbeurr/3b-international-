import {normalizeAvatar} from './avatar-rules.js';

const PREFIX='3b-avatar-draft-v4:user:';

const ownerId=uid=>typeof uid==='string'&&uid.trim()?uid.trim():null;

export function avatarDraftKey(uid){
 const owner=ownerId(uid);
 return owner?PREFIX+encodeURIComponent(owner):null;
}

export function readAvatarDraft(uid,base,storage=globalThis.localStorage){
 const fallback=normalizeAvatar(base);
 const owner=ownerId(uid),key=avatarDraftKey(owner);
 if(!owner||!key)return{avatar:fallback,recovered:false};
 try{
  const value=JSON.parse(storage?.getItem(key)||'null');
  if(value?.owner!==owner||!value?.avatar||typeof value.avatar!=='object')return{avatar:fallback,recovered:false};
  return{avatar:normalizeAvatar({...fallback,...value.avatar,created:fallback.created}),recovered:true};
 }catch{return{avatar:fallback,recovered:false};}
}

export function writeAvatarDraft(uid,avatar,storage=globalThis.localStorage){
 const owner=ownerId(uid),key=avatarDraftKey(owner);
 if(!owner||!key)return false;
 try{
  storage?.setItem(key,JSON.stringify({version:4,owner,updatedAt:Date.now(),avatar:normalizeAvatar({...avatar,created:false})}));
  return true;
 }catch{return false;}
}

export function clearAvatarDraft(uid,storage=globalThis.localStorage){
 const key=avatarDraftKey(uid);
 if(!key)return false;
 try{storage?.removeItem(key);return true;}catch{return false;}
}
