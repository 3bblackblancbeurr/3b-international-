export const PREMIUM_PRODUCT_EFFECTS=Object.freeze({
  CITY_ARCHITECT_PASS:Object.freeze({scope:'city',matrixRoads:true,champagneArchitecture:true,waterfront:true,brokenCircleMonument:true,nightLuxe:true}),
  WORLD_KAIS_ORIGIN_JACKET:Object.freeze({scope:'world',jacket:true,fabric:'#cdb46f',accent:'#151515'}),
  WORLD_MATRIX_AURA:Object.freeze({scope:'world',matrixAura:true}),
  WORLD_BROKEN_RING_EFFECT:Object.freeze({scope:'world',brokenRing:true}),
  WORLD_EIGHT_DOORS_ARRIVAL:Object.freeze({scope:'world',eightDoorsArrival:true}),
  WORLD_REFUGE_CHAMPAGNE_SET:Object.freeze({scope:'world',refugeChampagne:true}),
  CITY_MATRIX_ROAD_THEME:Object.freeze({scope:'city',matrixRoads:true}),
  CITY_CHAMPAGNE_ARCHITECTURE:Object.freeze({scope:'city',champagneArchitecture:true}),
  CITY_WATERFRONT_PREMIUM:Object.freeze({scope:'city',waterfront:true}),
  CITY_BROKEN_CIRCLE_MONUMENT:Object.freeze({scope:'city',brokenCircleMonument:true}),
  CITY_NIGHT_LUXE_THEME:Object.freeze({scope:'city',nightLuxe:true}),
});

export function ownedPremiumCodes(storeData){
  return new Set((storeData?.items||[]).filter(item=>item?.owned===true).map(item=>item.code));
}

export function premiumEffectsFromCodes(codes){
  const owned=codes instanceof Set?codes:new Set(Array.isArray(codes)?codes:[]);
  const result={codes:owned};
  for(const code of owned){
    const effect=PREMIUM_PRODUCT_EFFECTS[code];
    if(!effect)continue;
    Object.assign(result,effect);
  }
  return result;
}

export function premiumEffectFlags(storeData){
  return premiumEffectsFromCodes(ownedPremiumCodes(storeData));
}
