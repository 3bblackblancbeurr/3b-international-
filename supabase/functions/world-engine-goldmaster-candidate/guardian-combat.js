export const GUARDIAN_COMBAT_RULES=Object.freeze({
 france:Object.freeze({id:'verification',label:'Vérification',instruction:'Bloque ou évite une attaque pour vérifier la vraie ouverture. Frapper trop tôt est moins efficace.',success:'Preuve vérifiée · contre précis disponible'}),
 algerie:Object.freeze({id:'link',label:'Lien',instruction:'Reste relié au centre du combat. Fuir trop loin renforce l’impact de l’Oubli.',success:'Lien maintenu · protection renforcée'}),
 maroc:Object.freeze({id:'heritage',label:'Héritage à protéger',instruction:'Évite sans abandonner l’ancrage. Si tu laisses l’héritage seul trop longtemps, la mission échoue.',success:'Héritage protégé'}),
 tunisie:Object.freeze({id:'advance',label:'Avancer malgré le danger',instruction:'Évite les attaques en progressant vers la menace pour créer une ouverture.',success:'Danger traversé · ouverture gagnée'}),
 espagne:Object.freeze({id:'intensity',label:'Intensité',instruction:'Les frappes font monter l’intensité. Garde, esquive et respiration empêchent la surchauffe.',success:'Élan maîtrisé'}),
 italie:Object.freeze({id:'rebuild',label:'Défense reconstruite',instruction:'Le Gardien reconstruit une défense à chaque nouvelle phase. Crée une nouvelle ouverture au lieu de répéter le même plan.',success:'Défense brisée'}),
 turquie:Object.freeze({id:'uncertainty',label:'Signal incomplet',instruction:'Certains assauts masquent leur intention. Lis la forme au sol et engage-toi sans attendre un indicateur parfait.',success:'Cap maintenu malgré l’incertitude'}),
 estonie:Object.freeze({id:'observation',label:'Vraie fenêtre',instruction:'Les attaques hors ouverture frappent des leurres. Observe, évite, puis agis pendant la récupération.',success:'Leurre écarté · vraie cible visible'}),
});

export function guardianCombatRule(region){return GUARDIAN_COMBAT_RULES[region]||null;}

export function initialGuardianCombatState(region){
 return {
  guardianMeter:region==='maroc'?100:0,
  guardianShield:region==='italie'?26:0,
  guardianFlag:false,
  guardianStep:1,
 };
}

export function guardianCombatStatus(encounter){
 if(!encounter?.boss)return null;const rule=guardianCombatRule(encounter.region);if(!rule)return null;
 const field=encounter.field||{},distance=Math.hypot((field.p?.x||0)-(field.home?.x||0),(field.p?.z||0)-(field.home?.z||0));
 let status=rule.instruction;
 if(encounter.region==='france')status=encounter.guardianFlag?rule.success:'Vérifie une attaque avant de chercher le plein impact.';
 if(encounter.region==='algerie')status=distance>14?'Lien distendu · reviens vers le centre':'Lien stable · reste disponible pour ton groupe.';
 if(encounter.region==='maroc')status=`Intégrité de l’héritage : ${Math.max(0,Math.round(encounter.guardianMeter||0))} %`;
 if(encounter.region==='tunisie')status=encounter.opening?rule.success:'Avance pendant l’esquive au lieu de seulement reculer.';
 if(encounter.region==='espagne')status=`Intensité : ${Math.round(encounter.guardianMeter||0)} / 100`;
 if(encounter.region==='italie')status=(encounter.guardianShield||0)>0?`Défense reconstruite : ${Math.round(encounter.guardianShield)}`:rule.success;
 if(encounter.region==='turquie')status=encounter.guardianFlag?'Signal brouillé · lis uniquement la zone au sol':'Signal lisible.';
 if(encounter.region==='estonie')status=field.phase==='recovery'?rule.success:'Observe jusqu’à la récupération.';
 return {...rule,status};
}

export function validateGuardianCombatRules(){
 const rows=Object.entries(GUARDIAN_COMBAT_RULES);if(rows.length!==8)throw Error('Huit règles Gardien attendues');
 if(new Set(rows.map(([,rule])=>rule.id)).size!==8)throw Error('Mécanique Gardien dupliquée');
 for(const [region,rule] of rows)if(!rule.label||rule.instruction.length<40||rule.success.length<8)throw Error('Mécanique Gardien incomplète : '+region);
 return true;
}
