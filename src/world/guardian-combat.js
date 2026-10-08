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

const phase=(title,pattern,windup,recovery,speed,extra={})=>({title,pattern,windup,recovery,speed,...extra});
// Displayed poster vitality remains separate from the combat balance scale.
export const GUARDIAN_DISPLAY_VITALITY=Object.freeze({france:9200,algerie:9800,maroc:10100,tunisie:9600,espagne:9300,italie:9000,turquie:10500,estonie:8800});
export const GUARDIAN_BOSS_PHASES=Object.freeze({
 france:[phase('Les versions contradictoires',['frappe','rempart'],1100,1300,.62,{counter:1.15}),phase('La preuve sous le leurre',['éclipse','percée','rituel'],1000,1100,.70,{counter:1.25}),phase('La réparation proportionnée',['double','rempart','percée'],850,1200,.76,{counter:1.35})],
 algerie:[phase('Le groupe dispersé',['sable','frappe'],1200,1300,.60,{linkRadius:14}),phase('La route séparée',['percée','sable','rituel'],1050,1150,.72,{linkRadius:11}),phase('La confiance maintenue',['double','sable','frappe'],950,1250,.78,{linkRadius:8})],
 maroc:[phase('L’ouvrage fragile',['frappe','rempart'],1150,1300,.60,{wardRadius:12,wardLoss:8}),phase('L’avantage à abandonner',['sable','double'],1000,1200,.68,{wardRadius:10,wardLoss:12}),phase('La garde sans possession',['percée','double','rituel'],900,1300,.74,{wardRadius:8,wardLoss:16})],
 tunisie:[phase('L’issue visible',['vague','frappe'],1300,1250,.60,{advance:1}),phase('Le passage qui se ferme',['vague','percée','rituel'],1100,1150,.78,{advance:1.5}),phase('Le dernier secours',['double','vague','percée'],950,1300,.88,{advance:2})],
 espagne:[phase('Trouver le rythme',['frappe','double'],1150,1200,.65,{heat:22,decay:3}),phase('La foule accélère',['double','rituel','percée'],950,1000,.78,{heat:29,decay:2}),phase('L’élan maîtrisé',['percée','double','rituel'],850,1350,.84,{heat:34,decay:2})],
 italie:[phase('Le premier ouvrage',['rempart','frappe'],1200,1350,.58,{shield:26}),phase('Le plan qui cède',['soin','rempart','rituel'],1100,1200,.66,{shield:32,alternate:true}),phase('Reprendre autrement',['rempart','percée','double'],950,1400,.74,{shield:40,alternate:true})],
 turquie:[phase('Le repère fiable',['frappe','rituel'],1200,1300,.62,{hiddenEvery:4}),phase('L’information incomplète',['éclipse','double','frappe'],1050,1200,.70,{hiddenEvery:3}),phase('La parole maintenue',['double','gel','percée'],950,1300,.78,{hiddenEvery:2})],
 estonie:[phase('Le premier faux signal',['gel','frappe'],1250,1500,.56,{decoyFactor:.4}),phase('Le motif des copies',['rituel','éclipse','percée'],1050,1250,.66,{decoyFactor:.3}),phase('La vraie fenêtre',['double','gel','percée'],900,1000,.76,{decoyFactor:.2})],
});
export const GUARDIAN_PHASE_DIALOGUE=Object.freeze({
 france:['Une seule version ne suffit pas. Montre-moi ce que tu as vérifié.','L’Oubli imite la preuve. Observe encore, même lorsque tu crois savoir.','La justice doit aussi réparer. Ton contre est-il proportionné ?'],
 algerie:['Qui reste auprès de ceux qui avancent plus lentement ?','Le groupe se sépare. Rapproche les liens sans enfermer personne.','Je reconnais ceux qui restent quand la route devient difficile.'],
 maroc:['Cet ouvrage porte une vie entière. Ne le laisse pas seul.','Une ouverture facile peut coûter à quelqu’un d’autre. Choisis ton geste.','Ta garde protège sans posséder. Voilà ce que je devais retrouver.'],
 tunisie:['La peur est là. Cherche l’issue avant d’avancer.','Le passage se ferme ; attends le signe puis traverse avec ceux qui comptent sur toi.','Tu avances avec ta peur, sans la faire payer à quelqu’un d’autre.'],
 espagne:['L’énergie monte. Trouve le rythme qui te laisse maître de ton geste.','La foule demande davantage. Une respiration peut porter plus loin qu’une frappe.','Cet élan crée au lieu de consumer. Je peux le confier au Cercle.'],
 italie:['Ce qui a cédé ne revient pas à l’identique. Cherche une nouvelle ouverture.','Ma défense revient, mais le même plan ne suffira plus.','Tu n’as pas effacé l’échec. Tu as ouvert une autre possibilité.'],
 turquie:['Il manque des signes. Quel repère demeure vérifiable ?','Ne confonds pas le doute avec l’abandon de ta parole.','Tu as tenu le cap sans prétendre posséder toutes les réponses.'],
 estonie:['Les premières lueurs sont des copies. Observe leur répétition.','L’Oubli a appris l’ancien motif. Compare ce qui revient réellement.','Tu as attendu la vraie fenêtre. Le bruit ne décide plus à ta place.'],
});
export function guardianBossPhase(encounter){
 if(!encounter?.boss||encounter.patrol||encounter.final)return null;
 const ratio=(Number(encounter.enemy)||0)/Math.max(1,Number(encounter.enemyMax)||1),index=ratio<.35?3:ratio<.7?2:1;
 const rule=GUARDIAN_BOSS_PHASES[encounter.region]?.[index-1];return rule?{...rule,index,dialogue:GUARDIAN_PHASE_DIALOGUE[encounter.region][index-1]}:null;
}
export function displayedGuardianVitality(encounter){
 const max=GUARDIAN_DISPLAY_VITALITY[encounter?.region];if(!max||!encounter?.boss||encounter.patrol||encounter.final)return null;
 return{current:Math.round(max*Math.max(0,Math.min(1,(Number(encounter.enemy)||0)/Math.max(1,Number(encounter.enemyMax)||1)))),max,balanceMax:encounter.enemyMax};
}
export function guardianBossPresentation(encounter){
 const phase=guardianBossPhase(encounter);if(!phase)return null;
 const field=encounter.field||{},home=field.home||{x:0,z:0},radius=phase.linkRadius||phase.wardRadius||10;
 return{...phase,vitality:displayedGuardianVitality(encounter),anchor:{...home},radius,link:encounter.region==='algerie'?{stable:Math.hypot((field.p?.x||0)-home.x,(field.p?.z||0)-home.z)<=radius,points:[{x:home.x-4,z:home.z+3},{x:home.x+4,z:home.z+3},{x:home.x,z:home.z-4}]}:null,heritage:encounter.region==='maroc'?{integrity:encounter.guardianMeter,point:home}:null,intensity:encounter.region==='espagne'?encounter.guardianMeter:null,shield:encounter.region==='italie'?encounter.guardianShield:null,signal:encounter.region==='turquie'?{hidden:encounter.guardianFlag,reliable:field.aim}:null,decoys:encounter.region==='estonie'&&field.phase!=='recovery'?[{x:(field.enemy?.x||0)-4,z:field.enemy?.z||0},{x:(field.enemy?.x||0)+4,z:field.enemy?.z||0}]:[],verified:encounter.region==='france'?encounter.guardianFlag:null};
}

export function guardianCombatStatus(encounter){
 if(!encounter?.boss)return null;const rule=guardianCombatRule(encounter.region);if(!rule)return null;
 const field=encounter.field||{},distance=Math.hypot((field.p?.x||0)-(field.home?.x||0),(field.p?.z||0)-(field.home?.z||0));
 const bossPhase=guardianBossPhase(encounter);
 let status=rule.instruction;
 if(encounter.region==='france')status=encounter.guardianFlag?rule.success:'Vérifie une attaque avant de chercher le plein impact.';
 if(encounter.region==='algerie')status=distance>(bossPhase?.linkRadius||14)?'Lien distendu · reviens vers le centre':'Lien stable · reste disponible pour ton groupe.';
 if(encounter.region==='maroc')status=`Intégrité de l’héritage : ${Math.max(0,Math.round(encounter.guardianMeter||0))} %`;
 if(encounter.region==='tunisie')status=encounter.opening?rule.success:'Avance pendant l’esquive au lieu de seulement reculer.';
 if(encounter.region==='espagne')status=`Intensité : ${Math.round(encounter.guardianMeter||0)} / 100`;
 if(encounter.region==='italie')status=(encounter.guardianShield||0)>0?`Défense reconstruite : ${Math.round(encounter.guardianShield)}`:rule.success;
 if(encounter.region==='turquie')status=encounter.guardianFlag?'Signal brouillé · lis uniquement la zone au sol':'Signal lisible.';
 if(encounter.region==='estonie')status=field.phase==='recovery'?rule.success:'Observe jusqu’à la récupération.';
 return {...rule,status,phase:guardianBossPhase(encounter),presentation:guardianBossPresentation(encounter),vitality:displayedGuardianVitality(encounter)};
}

export function validateGuardianCombatRules(){
 const rows=Object.entries(GUARDIAN_COMBAT_RULES);if(rows.length!==8)throw Error('Huit règles Gardien attendues');
 if(new Set(rows.map(([,rule])=>rule.id)).size!==8)throw Error('Mécanique Gardien dupliquée');
 for(const [region,rule] of rows)if(!rule.label||rule.instruction.length<40||rule.success.length<8)throw Error('Mécanique Gardien incomplète : '+region);
 return true;
}
