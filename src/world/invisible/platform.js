// Publication is deliberate. No demonstration mission or invented real place is live.
export const HIDDEN_WORLD_RELEASE = Object.freeze({version:1,phase:'preparation',missions:Object.freeze([])});
export const RETIRED_CHALLENGE_ACTIONS = Object.freeze(['invisibleStart','invisibleAnswer','invisibleChest','invisiblePortal','invisibleConvergence']);
export function assertHiddenWorldAction(action){
 if(RETIRED_CHALLENGE_ACTIONS.includes(action?.type))throw Error('Les anciennes épreuves du Monde caché sont retirées. Aucune mission n’est ouverte actuellement.');
}
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
export function validateHiddenMission(input){
 const errors=[];
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,errors:['Configuration manquante.']};
 if(!text(input.id,80)||!/^[a-z0-9-]+$/.test(input.id))errors.push('Identifiant invalide.');
 if(!text(input.title,120))errors.push('Titre manquant.');
 if(!['draft','published','paused','archived'].includes(input.status))errors.push('État de publication invalide.');
 if(!['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].includes(input.realm))errors.push('Royaume invalide.');
 if(!['riddle','drawing'].includes(input.kind))errors.push('Type de découverte invalide.');
 const place=input.place;
 if(!place||!text(place.label,160)||!text(place.instructions,1000)||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180||!Number.isFinite(place.radiusMeters)||place.radiusMeters<10||place.radiusMeters>500)errors.push('Lieu précis, consignes et rayon de présence requis.');
 if(input.kind==='riddle'&&(!text(input.question,2000)||!text(input.validationKey,160)))errors.push('Question et référence de validation serveur requises.');
 if(input.kind==='drawing'&&(!text(input.targetAssetId,160)||!text(input.recognizerId,160)))errors.push('Dessin de référence et moteur de reconnaissance requis.');
 if(input.status==='published'&&(!text(input.publicationId,160)||input.serverValidated!==true))errors.push('Une publication doit être validée côté serveur.');
 return {ok:errors.length===0,errors};
}
export function hiddenMissionAvailability(mission){
 if(!mission)return {state:'empty',label:'Aucune découverte publiée'};
 const validation=validateHiddenMission(mission);
 if(!validation.ok)return {state:'invalid',label:'Configuration à compléter'};
 if(mission.status!=='published')return {state:mission.status,label:'Découverte non ouverte'};
 return {state:'ready',label:'Découverte disponible'};
}
