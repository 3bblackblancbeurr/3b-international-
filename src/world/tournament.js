import {attackContains} from './field-combat.js';
// Local exhibition tournament. This never awards a Guardian seal, a companion,
// account currency or a competitive ranking. Progress comes from real field inputs.
export const TOURNAMENT_ID='france:tournament';
export const TOURNAMENT_REWARD=Object.freeze({xp:180,shards:45});
export const TOURNAMENT_ROUNDS=Object.freeze([
 Object.freeze({id:'lecture',card:'C003',title:'Lire avant d’agir',rule:'Bloque une attaque avec ta garde, puis remporte le duel.',goal:1,enemyHP:88,intent:'frappe'}),
 Object.freeze({id:'mobilite',card:'C006',title:'Trouver le passage',rule:'Évite deux attaques en esquivant ou en quittant leur zone, puis remporte le duel.',goal:2,enemyHP:106,intent:'rituel'}),
 Object.freeze({id:'maitrise',card:'C014',title:'Choisir le juste moment',rule:'Touche avec ton pouvoir pendant une ouverture adverse, puis remporte le duel.',goal:1,enemyHP:128,intent:'rempart'}),
]);
const integer=(value,max)=>Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;
export const blankTournament=()=>({status:'available',round:0,attempts:0,rewarded:false});
export function normalizeTournament(value){
 const status=['available','active','between','defeat','abandoned','completed'].includes(value?.status)?value.status:'available';
 return {status,round:status==='completed'?3:integer(value?.round,2),attempts:integer(value?.attempts,99999),rewarded:value?.rewarded===true};
}
export function tournamentRound(save){
 const state=normalizeTournament(save?.adventure?.tournament);
 return TOURNAMENT_ROUNDS[Math.min(2,state.round)];
}
export function tournamentItem(save){
 const state=normalizeTournament(save?.adventure?.tournament),round=tournamentRound(save);
 return {id:TOURNAMENT_ID,type:'tournament',name:state.status==='completed'?'Tournoi des Liens · accompli':'Tournoi des Liens',x:-34,z:31,range:6,color:'#d6b46a',card:round.card,done:state.status==='completed'}; // gold-master-allow: existing tournament champagne accent, reviewed in WORLD_OPEN_WORLD_AUDIT_20261002.md.
}
// The center is already in landscape coordinates. Both render/navigation and
// authoritative combat use these footprints without importing terrain here.
export function tournamentObstacles(region,center){
 if(region!=='france'||!Number.isFinite(center?.x)||!Number.isFinite(center?.z))return [];
 return [-1,1].map(side=>({x:center.x+side*14,z:center.z-6,width:2,depth:8}));
}
export function applyTournamentRule(previous,next){
 if(!previous.tournament)return next;
 const round=TOURNAMENT_ROUNDS[previous.tournamentRound];
 if(!round)throw Error('Manche de tournoi inconnue.');
 let progress=integer(previous.tournamentProgress,round.goal);
 const resolved=previous.field?.phase==='windup'&&next.field?.phase==='recovery'&&['enemy','miss'].includes(next.field.last)&&next.hp>0;
 if(round.id==='lecture'&&resolved&&next.field.guard>0&&!next.field.dodge&&attackContains(next.field,previous.intent))progress++;
 if(round.id==='mobilite'&&resolved&&(next.field.dodge>0||!attackContains(next.field,previous.intent)))progress++;
 if(round.id==='maitrise'&&previous.field?.phase==='recovery'&&next.field?.last==='power'&&next.enemy<previous.enemy)progress++;
 next.tournamentProgress=Math.min(round.goal,progress);
 if(next.result==='victory'&&next.tournamentProgress<round.goal){
  next.enemy=1;next.result=null;next.log='La manche attend encore ton geste : '+round.rule;
 }else if(next.result==='victory')next.log='Manche remportée. Ton geste et ta victoire ont été validés.';
 return next;
}
