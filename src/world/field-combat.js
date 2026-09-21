import {initialGuardianCombatState} from './guardian-combat.js';
// Fixed-step combat shared by the browser and the account service. Inputs are
// directions and buttons; a client never submits damage, HP or a winning result.
export const COMBAT_TICK = 100;
export const ATTACK_RANGE = 7.2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const number=(v,f=0)=>Number.isFinite(v)?v:f;
const point=p=>({x:clamp(number(p?.x),-260,260),z:clamp(number(p?.z),-260,260)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function normalizeField(f){
 if(!f||f.version!==1)return null;
 const result={version:1,p:point(f.p),enemy:point(f.enemy),home:point(f.home),aim:point(f.aim)};
 for(const key of ['time','cooldown','dodge','guard','recover','windup','stagger','comboUntil','event'])result[key]=clamp(number(f[key]),0,1e9);
 result.stamina=clamp(number(f.stamina,100),0,100);result.combo=clamp(Math.floor(number(f.combo)),0,3);
 result.phase=['pursuit','windup','recovery'].includes(f.phase)?f.phase:'pursuit';
 result.last=['strike','power','guard','dodge','trap','support','resonance','enemy','miss'].includes(f.last)?f.last:null;
 return result;
}
export function startField(p,enemy){return normalizeField({version:1,p,enemy,home:enemy,aim:p,stamina:100,recover:800});}
export function attackShape(intent){return ['rituel','gel','éclipse','sable','vague'].includes(intent)?'circle':'cone';}
export function attackContains(field,intent,p=field.p){
 const area=attackShape(intent)==='circle',center=area?field.aim:field.enemy;
 if(distance(center,p)>(area?5.8:8.2))return false;
 if(area)return true;
 const ax=field.aim.x-field.enemy.x,az=field.aim.z-field.enemy.z,px=p.x-field.enemy.x,pz=p.z-field.enemy.z;
 return (ax*px+az*pz)/Math.max(.001,Math.hypot(ax,az)*Math.hypot(px,pz))>Math.cos(Math.PI*.31);
}
function useResonance(e,f,event){
 if(!e.resonance||!(e.resonanceCharges>0))return false;
 const id=e.resonance;
 if(id==='france'){
  e.opening=true;if(f.phase==='windup')f.windup+=350;e.log='Lecture juste : les faux signaux se séparent. Ta prochaine ouverture est plus lisible.';
 }else if(id==='algerie'){
  e.resonanceShield=Math.max(e.resonanceShield||0,.35);e.log='Lien fidèle : le prochain impact est partagé par le lien au lieu de t’isoler.';
 }else if(id==='maroc'){
  e.resonanceShield=Math.max(e.resonanceShield||0,.65);e.resonancePenalty=true;e.log='Garde noble : forte protection, mais ta prochaine attaque volontairement retenue frappe moins fort.';
 }else if(id==='tunisie'){
  f.dodge=Math.max(f.dodge,260);f.stamina=Math.min(100,f.stamina+24);e.log='Pas de courage : une courte fenêtre pour traverser le danger, sans rendre Kaïs invulnérable.';
 }else if(id==='espagne'){
  f.combo=2;f.comboUntil=f.time+2200;e.log='Élan maîtrisé : la prochaine frappe propre peut conclure un enchaînement renforcé.';
 }else if(id==='italie'){
  e.hp=Math.min(e.maxHP,e.hp+20);f.stamina=Math.min(100,f.stamina+12);e.log='Reprise : tu reconstruis juste assez pour essayer autrement.';
 }else if(id==='turquie'){
  e.focus=Math.min(3,e.focus+1);e.resonanceAnchor=true;e.log='Ancrage : tu conserves un repère fiable ; le prochain effet de gel ne peut pas disperser ta concentration.';
 }else if(id==='estonie'){
  e.opening=true;f.phase='recovery';f.windup=0;f.recover=Math.max(f.recover,800);f.stagger=Math.max(f.stagger,500);e.log='Clarté : le leurre tombe et la vraie fenêtre d’action apparaît.';
 }else return false;
 e.resonanceCharges=Math.max(0,e.resonanceCharges-1);f.cooldown=Math.max(f.cooldown,700);event('resonance');return true;
}
export function stepField(enc,input,move){
 if(!enc?.field||enc.result)throw Error('Cette rencontre est terminée.');
 if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.z)||Math.abs(input.x)>1||Math.abs(input.z)>1)throw Error('Direction de combat invalide.');
 if(input.kind&&!['strike','power','guard','dodge','trap','support','resonance'].includes(input.kind))throw Error('Action de combat inconnue.');
 const e={...enc,field:normalizeField(enc.field)},f=e.field,dt=COMBAT_TICK;
 const guardianBoss=!!e.boss&&!e.final;if(guardianBoss&&!e.guardianStep)Object.assign(e,initialGuardianCombatState(e.region));if(guardianBoss&&e.region==='espagne')e.guardianMeter=Math.max(0,(e.guardianMeter||0)-3);
 f.time+=dt;for(const key of ['cooldown','dodge','guard','recover','windup','stagger'])f[key]=Math.max(0,f[key]-dt);
 f.stamina=Math.min(100,f.stamina+2.8);f.last=null;
 const length=Math.hypot(input.x,input.z),direction={x:input.x/Math.max(1,length),z:input.z/Math.max(1,length)};
 const event=kind=>{f.last=kind;f.event++;e.turn++;};
 const kind=f.cooldown?null:input.kind;
 if(kind==='resonance'&&useResonance(e,f,event)){}
 else if(kind==='dodge'&&f.stamina>=32){
  let v=direction;if(length<.05){const x=f.p.x-f.enemy.x,z=f.p.z-f.enemy.z,d=Math.hypot(x,z)||1;v={x:z/d,z:-x/d};}
  f.p=move(f.p,v,5.2);f.stamina-=32;f.dodge=420;f.cooldown=550;e.opening=true;event(kind);
 }else if(kind==='guard'&&f.stamina>=18){f.stamina-=18;f.guard=950;f.cooldown=400;event(kind);}
 else if(kind==='support'&&e.support){e.support=false;e.hp=Math.min(e.maxHP,e.hp+32);f.cooldown=700;event(kind);}
 else if(kind==='trap'&&e.traps&&distance(f.p,f.enemy)<=18){e.traps--;f.stagger=1800;f.phase='recovery';f.recover=1800;f.windup=0;f.cooldown=700;event(kind);}
 else if((kind==='strike'||kind==='power')&&(kind!=='power'||e.focus>=2)){
  const inRange=distance(f.p,f.enemy)<=(kind==='power'?23:ATTACK_RANGE);
  f.cooldown=kind==='power'?1000:520;
  if(kind==='power')e.focus-=2;
  if(inRange){
   f.combo=f.time<f.comboUntil?f.combo%3+1:1;f.comboUntil=f.time+1800;
   let damage=e.stats.attack+e.stats.affinity;
   damage*=kind==='power'?2.1:1+(f.combo===3?.5:0);
   if(e.resonancePenalty){damage*=.8;e.resonancePenalty=false;}
   if(guardianBoss&&e.region==='france'){if(e.guardianFlag){damage*=1.2;e.guardianFlag=false;}else if(f.phase!=='recovery')damage*=.55;}
   if(guardianBoss&&e.region==='estonie'&&f.phase!=='recovery')damage*=.4;
   if(guardianBoss&&e.region==='espagne'){if((e.guardianMeter||0)>=80)damage*=.72;e.guardianMeter=Math.min(100,(e.guardianMeter||0)+(kind==='power'?34:24));}
   if(e.opening)damage*=1.35;
   if(e.intent==='rempart'&&f.phase!=='recovery')damage*=kind==='power'?.8:.55;
   if(f.phase==='recovery')damage*=1.2;
   let dealt=Math.round(damage),absorbed=0;
   if(guardianBoss&&e.region==='italie'&&(e.guardianShield||0)>0){absorbed=Math.min(e.guardianShield,dealt);e.guardianShield-=absorbed;dealt-=absorbed;}
   e.enemy=Math.max(0,e.enemy-dealt);e.opening=false;
   if(kind==='strike')e.focus=Math.min(3,e.focus+1);
   e.log=f.combo===3?'Enchaînement : troisième frappe renforcée.':'Une ouverture dans sa défense.';
  }else e.log='Ton attaque ne porte pas. Rapproche-toi ou utilise ton pouvoir.';
  event(kind);
 }
 if(guardianBoss&&e.region==='espagne'&&['guard','dodge'].includes(f.last))e.guardianMeter=Math.max(0,(e.guardianMeter||0)-18);
 if(length>.05)f.p=move(f.p,direction,1.05*clamp(e.stats.speed||1,.7,1.8)*(f.guard?.45:1));
 if(!e.enemy){e.result=e.boss?'victory':'calm';e.log=e.boss?'La menace est repoussée. Les environs peuvent respirer.':'La créature s’apaise. Tu peux gagner sa confiance.';return e;}
 // An enemy locks its aim at the start of preparation. Moving out of the
 // painted shape really avoids the impact; a player action does not cause it.
 const d=distance(f.p,f.enemy);
 if(f.phase==='pursuit'&&!f.stagger){
  if(d>6){const x=(f.p.x-f.enemy.x)/d,z=(f.p.z-f.enemy.z)/d;f.enemy=move(f.enemy,{x,z},e.expert?.78:.65);}
  if(d<=(attackShape(e.intent)==='circle'?17:8)&&!f.recover){f.phase='windup';f.windup=e.expert?750:1000;f.aim={...f.p};if(guardianBoss&&e.region==='turquie')e.guardianFlag=(e.turn+1)%3===0;}
 }else if(f.phase==='windup'&&!f.windup){
  const inside=attackContains(f,e.intent),blocked=!!f.guard,evaded=!!f.dodge||!inside;
  const resonanceReduction=Math.max(0,Math.min(.85,Number(e.resonanceShield)||0));
  const linkPenalty=guardianBoss&&e.region==='algerie'&&distance(f.p,f.home)>14?1.35:1;
  let hit=evaded?0:Math.round(({frappe:18,percée:27,double:30,rituel:22,gel:19,vague:28,sable:24,éclipse:25,rempart:14,soin:12}[e.intent]||18)*(e.expert?1.25:1)*(blocked?(e.intent==='percée'?.5:.18):1 )*(1-resonanceReduction)*linkPenalty);
  if(inside&&!evaded&&resonanceReduction)e.resonanceShield=0;
  if(guardianBoss&&e.region==='maroc'&&evaded&&distance(f.p,f.home)>10)e.guardianMeter=Math.max(0,(e.guardianMeter||100)-12);
  if(guardianBoss&&e.region==='maroc'&&blocked&&distance(f.p,f.home)<=10)e.opening=true;
  if(guardianBoss&&e.region==='tunisie'&&evaded&&distance(f.p,f.enemy)<distance(f.aim,f.enemy)-1){e.opening=true;e.focus=Math.min(3,e.focus+1);}
  if(guardianBoss&&e.region==='france'&&(blocked||evaded))e.guardianFlag=true;
  e.hp=Math.max(0,e.hp-hit);if(blocked&&inside&&!evaded){e.opening=true;if(e.hp)e.hp=Math.min(e.maxHP,e.hp+(e.stats.heal||0));}
  if(guardianBoss&&e.region==='maroc'&&(e.guardianMeter||0)<=0){e.result='defeat';e.log='L’héritage n’a pas été protégé. Reviens avec une autre approche.';return e;}
  if(e.intent==='soin')e.enemy=Math.min(e.enemyMax,e.enemy+12);
  if(e.intent==='gel'&&hit&&!blocked){if(e.resonanceAnchor)e.resonanceAnchor=false;else e.focus=Math.max(0,e.focus-1);}
  e.log=hit?`Impact : −${hit} vitalité.`:inside?'Esquive réussie.':'Attaque évitée en quittant sa trajectoire.';
  event(hit||inside?'enemy':'miss');f.phase='recovery';f.recover=e.expert?850:1150;
  if(guardianBoss&&e.region==='turquie')e.guardianFlag=false;
  if(!e.hp){e.result='defeat';e.log='Retourne au refuge et prépare ton groupe. Tes compagnons restent avec toi.';}
 }else if(f.phase==='recovery'&&!f.recover){f.phase='pursuit';const nextPhase=e.enemy/e.enemyMax<.35?3:e.enemy/e.enemyMax<.7?2:1;if(guardianBoss&&e.region==='italie'&&nextPhase>(e.guardianStep||1)){e.guardianShield=18+nextPhase*6;e.guardianStep=nextPhase;}e.phase=nextPhase;const pattern=FIELD_PATTERNS[e.region]||FIELD_PATTERNS.france;e.intent=pattern[Math.floor(f.time/2400)%pattern.length];}
 return e;
}
// Patterns retain each country's identity without importing presentation code.
const FIELD_PATTERNS={france:['frappe','rempart','rituel','percée'],italie:['rempart','frappe','rituel','soin'],estonie:['gel','rituel','frappe','percée'],turquie:['frappe','éclipse','rituel','double'],algerie:['sable','frappe','rituel','soin'],tunisie:['vague','rituel','rempart','percée'],maroc:['frappe','sable','double','rituel'],espagne:['double','rituel','frappe','percée']};
