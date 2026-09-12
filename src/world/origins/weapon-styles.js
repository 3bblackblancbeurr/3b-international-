export const STYLE_RULES={
 paris:{name:'Lance · précision',technique:'Estoc de précision',guard:.35,description:'Estoc étroit : aligne la cible. Au contact, la pointe perd sa puissance.'},
 scissors:{name:'Ciseaux · séparation',technique:'Séparer / rappeler',guard:.45,description:'Les lames restent éloignées 4 secondes. Portée accrue, mais aucune parade pendant leur vol.'},
 zellige:{name:'Bouclier · protection',technique:'Rempart',guard:.8,description:'La garde protège devant toi, ralentit la marche et consomme de l’endurance à chaque impact.'}
};
export const styleFor=avatar=>STYLE_RULES[avatar?.weapon]||null;
export function styleAttack(def,kind,avatar,c={}){
 if(avatar?.weapon==='paris')return {...def,arc:kind==='circle'?.94:.78,minRange:1.15,closeMultiplier:.55,...(kind==='circle'?{damage:36,range:5.5,duration:.8,impact:.32}: {})};
 if(avatar?.weapon==='scissors'&&c.detached>0)return {...def,range:6,damage:def.damage*.8,duration:def.duration*1.2,impact:def.impact+.12,arc:.5};
 return {...def,arc:kind==='circle'?-1:.05};
}
export function tickWeaponState(c,dt){c.guard=Math.max(0,(c.guard||0)-dt);c.guardAge=(c.guardAge||0)+dt;c.detached=Math.max(0,(c.detached||0)-dt);c.recalling=Math.max(0,(c.recalling||0)-dt);}
export function defenseOutcome(c,heading,player,enemy,area=false){
 const style=styleFor(c.loadout),front=Math.cos(Math.atan2(enemy.x-player.x,enemy.z-player.z)-heading)>.35;
 if(!style||!c.guard||!front||area||c.detached>0||c.recalling>0)return {reduction:0,blocked:false};
 if(c.stamina<18){c.stamina=0;c.guard=0;return {reduction:0,blocked:false,broken:true};}
 c.stamina-=18;const perfect=c.guardAge<.25;c.guard=0;if(perfect)c.counterWindow=1.2;
 return {reduction:perfect?.95:style.guard,blocked:true,perfect};
}
