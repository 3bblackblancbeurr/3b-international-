export const W = 900, H = 620;
export const COUNTRIES = ['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne'];
export const COLORS = ['#8bbaff','#81d8af','#a6b8ed','#ee9c8d','#78c6a4','#edc095','#e99e71','#eed175'];
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function rng(seed=Date.now()) { let v=seed>>>0; return ()=>{v+=0x6D2B79F5;let t=Math.imul(v^v>>>15,1|v);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}; }
export const pick = (list,random)=>list[Math.floor(random()*list.length)];
export function shuffle(list,random) {const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function movePlayer(p,input,dt,speed=205) { let x=input.x||0,y=input.y||0;const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}p.x=clamp(p.x+x*speed*dt,25,W-25);p.y=clamp(p.y+y*speed*dt,35,H-25);p.moving=!!n;if(x)p.facing=x>0?1:-1; }
export class BaseGame {
  constructor(seed){this.random=rng(seed);this.time=0;this.status='playing';this.message='';this.effects=[];this.player={x:W/2,y:H/2,hp:100,maxHp:100,facing:1};this.score=0;}
  effect(x,y,color='#eed175',text=''){this.effects.push({x,y,color,text,life:.65});}
  tick(dt){this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);}
  finish(won,message){if(this.status==='ended')return;this.status='ended';this.won=won;this.message=message;}
}
export const POWERS = [
  {id:'blades',name:'Couteaux tournoyants',desc:'Des lames orbitent autour de Kaïs et frappent les ombres proches.',icon:'✧'},
  {id:'lightning',name:'Éclairs',desc:'La foudre frappe plusieurs ennemis toutes les 2 secondes.',icon:'ϟ'},
  {id:'frost',name:'Cercle de gel',desc:'Ralentit les ombres et blesse celles qui s’approchent.',icon:'❄'},
  {id:'ghost',name:'Double fantôme',desc:'Un double tire à tes côtés. Chaque niveau augmente ses dégâts.',icon:'◈'},
  {id:'heart',name:'Cœur de lumière',desc:'Récupère 30 points de vie et augmente la vie maximale de 20.',icon:'♡'},
  {id:'magnet',name:'Appel des fragments',desc:'Attire les fragments plus loin et accélère tes attaques.',icon:'◎'}
];
