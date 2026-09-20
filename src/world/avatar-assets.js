export const AVATAR_ASSET_SLOTS=Object.freeze({
  top:['none','hoodie','worker','polo','qamis'],
  jacket:['none','worker-jacket','country-jacket'],
  pants:['none','trouser','jean','country-pants'],
  shoes:['none','sneakers','boots','country-shoes'],
  gloves:['none','classic-gloves','sport-gloves'],
  glasses:['none','classic-glasses','matrix-glasses'],
  bag:['none','crossbody','backpack','country-bag'],
  jewelry:['none','chain','ring','country-jewel'],
  collection:['3b','france','algerie','maroc','tunisie','turquie','espagne','italie','estonie'],
});

export const AVATAR_SLOT_LABELS=Object.freeze({
  top:'Haut',jacket:'Veste',pants:'Pantalon',shoes:'Chaussures',gloves:'Gants',
  glasses:'Lunettes',bag:'Sac',jewelry:'Bijou',collection:'Collection',
});

export function blankAvatarAssetSlots(){
  return {top:'hoodie',jacket:'none',pants:'trouser',shoes:'sneakers',gloves:'none',glasses:'none',bag:'none',jewelry:'none',collection:'3b'};
}

export function normalizeAvatarAssetSlots(input){
  const result=blankAvatarAssetSlots(),source=input&&typeof input==='object'?input:{};
  for(const [slot,allowed] of Object.entries(AVATAR_ASSET_SLOTS))if(allowed.includes(source[slot]))result[slot]=source[slot];
  return result;
}

export function avatarAssetTargets(slots){
  const normalized=normalizeAvatarAssetSlots(slots);
  return Object.entries(normalized)
    .filter(([slot,value])=>slot==='collection'||value!=='none')
    .map(([slot,value])=>({slot,value,key:`${normalized.collection}:${slot}:${value}`}));
}
