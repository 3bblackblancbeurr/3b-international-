// Presentation derives from the current canonical objective. Opening a clue
// never collects it; the engine still validates position, order and choices.
export function localCampaignInteraction(current,position,objective){
 if(!current?.staging||!['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].includes(current.region)||current.finished||current.objective!==objective)return null;
 const point=current.target;
 if(![position?.x,position?.z,point?.x,point?.z].every(Number.isFinite))return null;
 // A running relay has two real contact points. Keep the first plateau's
 // conversation available long enough to point Kaïs toward the second one.
 const first=current.started&&current.mode==='relay'?current.relay?.companion:null;
 const targetDistance=Math.hypot(position.x-point.x,position.z-point.z);
 const firstDistance=Number.isFinite(first?.x)&&Number.isFinite(first?.z)?Math.hypot(position.x-first.x,position.z-first.z):Infinity;
 const distance=Math.min(targetDistance,firstDistance),range=current.range||6;
 if(distance>range)return null;
 return {objective:current.objective,distance,speaker:current.staging.speaker,place:current.staging.place,
  clue:current.staging.clue,actionLabel:current.staging.actionLabel,
  operation:current.mode==='rebuild'?'repair':'interact',ready:current.actionReady!==false,
  message:current.instruction!==current.dialogue?current.instruction:null};
}

export function franceFieldInteraction(current,position,objective){
 return current?.region==='france'?localCampaignInteraction(current,position,objective):null;
}

export const FRANCE_EVIDENCE_LABELS=Object.freeze({
 temoignage_lea:'Parole de Léa',temoignage_quai:'Témoignage du quai',date_originale:'Date originale',
 couture:'Fil de reliure',correction:'Page corrigée',aveu:'Aveu du greffier',
});

export function franceCollectedEvidence(inventory={}){
 return Object.entries(FRANCE_EVIDENCE_LABELS).filter(([id])=>inventory[id]>0).map(([id,label])=>({id,label}));
}
