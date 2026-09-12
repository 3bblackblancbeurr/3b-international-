import {distance,lineClear} from './space.js';
export const COMPANION_POWERS={
 silver:{name:'Garde du lien',cost:20,cooldown:18,description:'Réduit de 40 % le prochain impact reçu dans les 4 secondes.',weakness:'Ne protège que d’un seul coup.',synergy:['claws','zellige']},
 sand:{name:'Second souffle',cost:20,cooldown:18,description:'Rend 28 points d’endurance. Nécessite au moins 28 points manquants.',weakness:'Ne soigne pas et ne réduit pas les dégâts.',synergy:['carthage','axe']},
 night:{name:'Entrave nocturne',cost:25,cooldown:18,description:'Ralentit les déplacements de l’adversaire de 35 % pendant 4 secondes.',weakness:'Ne ralentit pas ses attaques déjà annoncées.',synergy:['thread','saber']}
};
export const companionPower=id=>COMPANION_POWERS[id]||COMPANION_POWERS.silver;
export function invokeCompanion(runtime,combat,{now,avatar,player,companion,zone,flags,active}){
 const power=companionPower(avatar.companion),cost=power.cost-(power.synergy.includes(avatar.weapon)?5:0);
 if(!active||combat.hp<=0||combat.enemy.hp<=0)return {ok:false,text:'Cette capacité s’utilise pendant un combat.'};
 if(now<runtime.readyAt)return {ok:false,text:`Le lien se recharge : ${Math.ceil(runtime.readyAt-now)} s.`};
 if(distance(player,companion)>6||!lineClear(player,companion,zone,flags))return {ok:false,text:'Rapproche-toi de ton compagnon, sans obstacle entre vous.'};
 if(combat.energy<cost)return {ok:false,text:`Il faut ${cost} points d’énergie pour ${power.name}.`};
 if(avatar.companion==='sand'&&combat.stamina>72)return {ok:false,text:'Utilise Second souffle lorsqu’il te manque au moins 28 points d’endurance.'};
 if(avatar.companion==='night'&&(distance(player,combat.enemy)>8||!lineClear(player,combat.enemy,zone,flags)))return {ok:false,text:'L’adversaire doit être visible à moins de 8 mètres.'};
 combat.energy-=cost;runtime.readyAt=now+power.cooldown;
 if(avatar.companion==='sand')combat.stamina=Math.min(100,combat.stamina+28);
 else if(avatar.companion==='night')combat.companionSlow=4;
 else combat.companionGuard=4;
 return {ok:true,text:`${power.name} activé · ${cost} énergie.`,name:power.name};
}
