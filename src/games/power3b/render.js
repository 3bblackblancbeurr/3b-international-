import {NATIONS,UNIT_TYPES} from './constants.js';
import {SECTORS,neighbors} from './board.js';
import {unitsIn,sectorStrength} from './state.js';
export const BOARD_W=1600,BOARD_H=1000;
const hex=(ctx,x,y,r)=>{ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();};
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-t,3);
function line(ctx,a,b,alpha=.2){ctx.strokeStyle='rgba(213,190,132,'+alpha+')';ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
function piece(ctx,u,x,y,selected,alpha=1,scale=1,moving=false){
 const n=NATIONS[u.nation],spec=UNIT_TYPES[u.type];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(scale,scale);ctx.shadowBlur=selected?24:moving?20:13;ctx.shadowColor=n.primary;
 const g=ctx.createRadialGradient(-6,-8,2,0,0,23);g.addColorStop(0,'#fff7db');g.addColorStop(.16,n.primary);g.addColorStop(.72,'#101722');g.addColorStop(1,'#05080d');
 ctx.fillStyle=g;ctx.strokeStyle=selected?'#ffe7a7':moving?'#fff0bd':'rgba(238,213,153,.72)';ctx.lineWidth=selected||moving?3:1.5;ctx.beginPath();ctx.ellipse(0,0,24,18,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;ctx.fillStyle='#f9edcf';ctx.font='700 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(spec.icon,0,-1);ctx.restore();
}
function blast(ctx,x,y,t,nation){
 ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.strokeStyle=NATIONS[nation]?.primary||'#f5d58a';ctx.lineWidth=4;ctx.shadowBlur=24;ctx.shadowColor='#ffb86b';ctx.beginPath();ctx.arc(x,y,12+58*t,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(255,220,150,'+(Math.max(0,.28-t*.25))+')';ctx.beginPath();ctx.arc(x,y,8+28*t,0,Math.PI*2);ctx.fill();ctx.restore();
}
function unitOffset(index){return{x:-34+(index%5)*17,y:-10+(index%2)*15};}
export function renderPowerBoard(ctx,state,ui={}){
 ctx.clearRect(0,0,BOARD_W,BOARD_H);
 const bg=ctx.createRadialGradient(800,480,100,800,500,880);bg.addColorStop(0,'#173047');bg.addColorStop(.48,'#0b1826');bg.addColorStop(1,'#05080d');ctx.fillStyle=bg;ctx.fillRect(0,0,BOARD_W,BOARD_H);
 ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#86b6d0';ctx.lineWidth=1;for(let x=0;x<=BOARD_W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,BOARD_H);ctx.stroke();}for(let y=0;y<=BOARD_H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(BOARD_W,y);ctx.stroke();}ctx.restore();
 const by=new Map(SECTORS.map(s=>[s.id,s])),drawn=new Set();for(const s of SECTORS)for(const id of neighbors(s.id)){const key=[s.id,id].sort().join(':');if(drawn.has(key))continue;drawn.add(key);line(ctx,s,by.get(id),s.type===by.get(id).type?0.2:0.11);}
 ctx.save();ctx.translate(800,500);ctx.strokeStyle='rgba(229,199,129,.33)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,116,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(5,17,29,.76)';ctx.fill();ctx.fillStyle='#d9c18b';ctx.font='600 18px system-ui';ctx.textAlign='center';ctx.fillText('NEXUS STRATÉGIQUE',0,-7);ctx.fillStyle='#8aaec1';ctx.font='12px system-ui';ctx.fillText('TERRE · MER · AIR',0,16);ctx.restore();
 const animating=!!ui.previousState&&Number.isFinite(ui.progress)&&ui.progress<1;
 for(const s of SECTORS){
  const owner=state.owners[s.id],nation=Number.isInteger(owner)?NATIONS[owner]:null,selected=ui.sectorId===s.id,legal=ui.legalTargets?.includes(s.id);
  ctx.save();ctx.shadowBlur=selected||legal?28:10;ctx.shadowColor=legal?'#f5d58a':nation?.primary||'#6a879a';
  hex(ctx,s.x,s.y,s.id.startsWith('hq')?58:45);ctx.fillStyle=nation?hexAlpha(nation.primary,s.type==='sea'?.30:.36):'rgba(27,49,66,.7)';ctx.fill();ctx.strokeStyle=legal?'#ffe2a1':selected?'#ffffff':s.type==='sea'?'#5aa2c5':'rgba(220,199,145,.63)';ctx.lineWidth=legal||selected?4:2;ctx.stroke();ctx.shadowBlur=0;
  if(s.type==='sea'){ctx.strokeStyle='rgba(116,190,226,.35)';ctx.lineWidth=2;for(let k=-1;k<=1;k++){ctx.beginPath();ctx.arc(s.x-5,s.y+k*8,16,0,Math.PI);ctx.stroke();}}
  if(s.hq!==null){ctx.fillStyle='#e7d29b';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(NATIONS[s.hq].code,s.x,s.y-33);}
  ctx.fillStyle='#dfe8ee';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillText(s.name.toUpperCase(),s.x,s.y+67);
  const all=unitsIn(state,s.id),combat=all.filter(u=>u.type!=='flag');if(combat.length){ctx.fillStyle='rgba(4,9,15,.78)';ctx.beginPath();ctx.roundRect(s.x-34,s.y+29,68,22,9);ctx.fill();ctx.fillStyle='#f0d99b';ctx.font='700 12px system-ui';ctx.fillText('P '+[...new Set(combat.map(u=>u.nation))].reduce((sum,n)=>sum+sectorStrength(state,s.id,n),0),s.x,s.y+44);}
  ctx.restore();
  if(!animating){const visible=all.slice(0,5);visible.forEach((u,i)=>{const o=unitOffset(i);piece(ctx,u,s.x+o.x,s.y+o.y,ui.unitIds?.includes(u.id));});if(all.length>5){ctx.fillStyle='#fff';ctx.font='700 12px system-ui';ctx.fillText('+'+(all.length-5),s.x+42,s.y+3);}}
 }
 if(animating){
  const p=ease(Math.max(0,Math.min(1,ui.progress))),prevById=new Map(ui.previousState.units.map(u=>[u.id,u])),slot=new Map();
  for(const u of state.units){const target=by.get(u.sectorId);if(!target)continue;const index=slot.get(u.sectorId)||0;slot.set(u.sectorId,index+1);if(index>=5)continue;const to=unitOffset(index),prev=prevById.get(u.id),fromSector=prev?by.get(prev.sectorId):target,from=prev?unitOffset(Math.min(index,4)):to,moved=!!prev&&prev.sectorId!==u.sectorId;
   const x=lerp(fromSector.x+from.x,target.x+to.x,p),y=lerp(fromSector.y+from.y,target.y+to.y,p)-(moved?Math.sin(Math.PI*p)*25:0),scale=prev?1:.68+.32*p,alpha=prev?1:Math.min(1,p*2.3);piece(ctx,u,x,y,ui.unitIds?.includes(u.id),alpha,scale,moved);
  }
  const nextIds=new Set(state.units.map(u=>u.id));for(const old of ui.previousState.units){if(old.type==='flag'||nextIds.has(old.id))continue;const s=by.get(old.sectorId);if(s)blast(ctx,s.x,s.y,p,old.nation);}
 }
 ctx.save();ctx.fillStyle='rgba(4,9,14,.68)';ctx.fillRect(0,0,BOARD_W,58);ctx.fillStyle='#e5ce95';ctx.font='800 22px system-ui';ctx.textAlign='left';ctx.fillText('POWER 3B',28,37);ctx.fillStyle='#9fb6c6';ctx.font='600 13px system-ui';ctx.fillText('MANCHE '+state.round+' · 8 NATIONS · ORDRES SIMULTANÉS',190,36);ctx.restore();
}
function hexAlpha(hex,a){const h=hex.replace('#','');const n=parseInt(h,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
