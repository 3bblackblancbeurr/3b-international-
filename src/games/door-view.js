import {drawMazeHero,MAZE_HERO_ASSET} from './maze-hero.js';
import {GUARDIAN_FRAMES} from './door-art.js';
const images={};
export async function loadDoorAssets(){
 await Promise.all(['forbidden-hall.webp','forbidden-guardian.webp',MAZE_HERO_ASSET].map(name=>images[name]?Promise.resolve():new Promise((resolve,reject)=>{
  const im=new Image(),timer=setTimeout(()=>reject(Error('Le décor prend trop de temps à charger. Réessaie.')),20000);
  im.onload=()=>{clearTimeout(timer);images[name]=im;resolve();};im.onerror=()=>{clearTimeout(timer);reject(Error('Une illustration ne s’est pas chargée. Réessaie.'));};im.src='/games/'+name;
 })));return images;
}
export function drawDoorEncounter(canvas,g,reduced=false){
 if(!canvas)return;const c=canvas.getContext('2d'),r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}if(!w||!h)return;
 const width=800,height=340,scale=Math.min(w/width,h/height);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(scale,0,0,scale,(w-width*scale)/2,(h-height*scale)/2);
 const bg=images['forbidden-hall.webp'];if(bg){const scale=Math.max(width/bg.width,height/bg.height);c.drawImage(bg,(width-bg.width*scale)/2,height-bg.height*scale,bg.width*scale,bg.height*scale);}
 const shade=c.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#07111765');shade.addColorStop(.6,'#07111745');shade.addColorStop(1,'#071117d9');c.fillStyle=shade;c.fillRect(0,0,width,height);
 const aura=(x,y,rx,ry,color)=>{c.save();c.translate(x,y);c.scale(1,ry/rx);const fill=c.createRadialGradient(0,0,0,0,0,rx);fill.addColorStop(0,color);fill.addColorStop(1,'transparent');c.fillStyle=fill;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();};
 aura(260,310,130,20,'#6faec64d');aura(548,310,145,24,'#edb16747');
 const anim=reduced?0:g.actionAnim/.5,lunge=g.lastAction==='guard'?0:Math.sin(anim*Math.PI)*40;
 const hero=images[MAZE_HERO_ASSET];if(hero){c.save();c.translate(256+lunge+(g.heroHit>0&&!reduced?Math.sin(g.heroHit*70)*5:0),312);c.scale(2.1,2.1);c.globalAlpha=g.heroHit>0?.8:1;drawMazeHero(c,hero,{direction:2,frame:anim>0?Math.min(6,Math.ceil(anim*6)):0},0,0);c.restore();}
 const guardian=images['forbidden-guardian.webp'];if(guardian&&g.enemy){const index=g.enemyHit>0?3:g.enemy.intent==='heavy'?1:g.enemy.intent==='guard'?2:0,f=GUARDIAN_FRAMES[index],scale=270/GUARDIAN_FRAMES[0][3];c.save();if(g.enemy.hp<=0)c.globalAlpha=.3;c.translate(550+(g.enemyHit>0&&!reduced?Math.sin(g.enemyHit*50)*7:0),314);c.drawImage(guardian,...f,-f[2]*scale/2,-f[3]*scale,f[2]*scale,f[3]*scale);c.restore();}
 if(g.lastAction==='guard'&&(g.actionAnim>0||g.counter)){c.strokeStyle='#b8eeed';c.lineWidth=2;c.shadowColor='#8adddf';c.shadowBlur=18;c.beginPath();c.ellipse(298,225,38,85,-.15,-1.4,1.6);c.stroke();c.shadowBlur=0;}
 if(anim>0&&g.lastAction!=='guard'){c.save();c.globalAlpha=Math.sin(anim*Math.PI);c.strokeStyle=g.lastAction==='break'?'#a6eced':'#ffe3a2';c.lineWidth=g.lastAction==='break'?8:4;c.beginPath();c.arc(414,202,81,-1.1,1.3);c.stroke();c.restore();}
 if(!reduced)for(let i=0;i<15;i++){c.fillStyle='#f4d39866';c.beginPath();c.arc((i*127+Math.sin(g.time+i)*8)%width,(i*71-g.time*9+34000)%height,1,0,Math.PI*2);c.fill();}
}
