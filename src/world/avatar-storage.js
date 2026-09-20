// Local artwork and drafts are scoped to the authenticated account (or guest).
// Old unscoped keys are deliberately left untouched and never used as fallback.
export const AVATAR_PORTRAIT_EVENT='3b-avatar-portrait-changed';
export function avatarStorageKeys(uid){
 const owner=typeof uid==='string'&&uid.trim()?uid.trim():null;
 const scope=owner?'user:'+encodeURIComponent(owner):'guest';
 return Object.freeze({owner,presets:'3b-avatar-presets-v2:'+scope,draft:'3b-avatar-draft-v3:'+scope,portrait:'3b-passport-avatar-portrait-v1:'+scope});
}
export function readAvatarPortrait(uid,storage=globalThis.localStorage){
 if(!uid)return '';
 try{
  const value=JSON.parse(storage?.getItem(avatarStorageKeys(uid).portrait)||'null');
  return value?.owner===uid&&typeof value.image==='string'&&value.image.length<=2000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value.image)?value.image:'';
 }catch{return '';}
}
export function writeAvatarPortrait(uid,image,storage=globalThis.localStorage){
 const key=avatarStorageKeys(uid);
 if(typeof image!=='string'||image.length>2000000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return false;
 try{storage.setItem(key.portrait,JSON.stringify({owner:key.owner,image}));return true;}catch{return false;}
}
