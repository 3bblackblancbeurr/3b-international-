export const GUARDIAN_ASSETS=Object.freeze({
  fr:{id:'celiane',name:'Céliane',countryId:'fr',value:'Justice',portrait:null,alt:'Portrait officiel de Céliane — Gardienne de la Justice'},
  dz:{id:'yliane',name:'Yliane',countryId:'dz',value:'Loyauté',portrait:null,alt:'Portrait officiel de Yliane — Gardienne de la Loyauté'},
  es:{id:'diego',name:'Diego',countryId:'es',value:'Passion',portrait:null,alt:'Portrait officiel de Diego — Gardien de la Passion'},
  ma:{id:'nael',name:'Naël',countryId:'ma',value:'Noblesse',portrait:null,alt:'Portrait officiel de Naël — Gardien de la Noblesse'},
  it:{id:'alessio',name:'Alessio',countryId:'it',value:'Espoir',portrait:null,alt:'Portrait officiel d’Alessio — Gardien de l’Espoir'},
  tn:{id:'soraya',name:'Soraya',countryId:'tn',value:'Courage',portrait:null,alt:'Portrait officiel de Soraya — Gardienne du Courage'},
  tr:{id:'emir',name:'Émir',countryId:'tr',value:'Foi',portrait:null,alt:'Portrait officiel d’Émir — Gardien de la Foi'},
  ee:{id:'eira',name:'Eira',countryId:'ee',value:'Sagesse',portrait:null,alt:'Portrait officiel d’Eira — Gardienne de la Sagesse'},
});
export function guardianAssetFor(countryId){return GUARDIAN_ASSETS[countryId]||null;}
export function hasCanonicalGuardianPortrait(countryId){return Boolean(guardianAssetFor(countryId)?.portrait);}
