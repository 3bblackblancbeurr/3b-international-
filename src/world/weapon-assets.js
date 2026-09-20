// Activates only assets that really exist in the repository.
// Add a path here only after the GLB/GLTF passes the asset validation tests.
export const WEAPON_ASSETS={
 heritage:null,paris:null,romano:null,tallinn:null,bosphore:null,alger:null,carthage:null,zellige:null,
 abanico:null,scissors:null,axe:null,saber:null,bow:null,claws:null,wings:null,thread:null
};

export const weaponAssetPath=id=>WEAPON_ASSETS[id]||null;
export const availableWeaponAssets=()=>Object.entries(WEAPON_ASSETS).filter(([,path])=>!!path).map(([id,path])=>({id,path}));
