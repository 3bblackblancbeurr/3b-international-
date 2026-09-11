import {atmosphere,finishScene} from './scenery.js';
import {mazeScene} from './maze-view.js';
import {MAZE_HERO_ASSET} from './maze-hero.js';
import {W,H,COLORS} from './core.js';
const images={},frames=[],loading={};
export const loadAssets=()=>Promise.all(['kais-run.webp','objects.webp','night-plaza.webp','maze-ruins.webp',MAZE_HERO_ASSET].map(name=>{
 if(images[name])return Promise.resolve();if(loading[name])return loading[name];
 loading[name]=new Promise((resolve,reject)=>{const im=new Image(),timer=setTimeout(()=>{delete loading[name];reject(new Error('Le chargement prend trop de temps. Réessaie.'));},20000);
 im.onload=()=>{clearTimeout(timer);images[name]=im;if(name==='kais-run.webp'){frames.length=0;for(let i=0;i<8;i++)frames.push([(i%4)*im.width/4+im.width*.076,Math.floor(i/4)*im.height/2,im.width*.15,im.height/2]);}resolve();};im.onerror=()=>{clearTimeout(timer);delete loading[name];reject(new Error('Une image du jeu ne s’est pas chargée. Réessaie.'));};im.src='/games/'+name;});return loading[name];}));
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
export function label(c,text,x,y,color='#eed175',size=18){c.font=`600 ${size}px system-ui`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
function sprite(c,kind,x,y,h=50,time=0,facing=1){c.save();c.shadowColor=kind==='kais'?'#69aeef':'#567c97';c.shadowBlur=kind==='kais'?7:3;c.translate(x,y+10);c.scale(facing,1);if(kind==='kais'){const im=images['kais-run.webp'],r=frames[Math.floor(time*10)%8];if(im&&r)c.drawImage(im,...r,-h*.31,-h,h*.62,h);}else{const im=images['objects.webp'];const cells={monster:[1024,470,512,554],portal:[0,470,512,554],gem:[1024,0,512,470],barrier:[0,0,512,470],rubble:[512,0,512,470],key:[512,470,512,554]};if(im)c.drawImage(im,...cells[kind],-h*.5,-h,h,h);}c.restore();}
export function render(c,g,kind,canvas){const worldW=g.viewWidth||W,sx=canvas.width/worldW,sy=canvas.height/(g.viewHeight||H);c.setTransform(sx,0,0,sy,0,0);if(kind==='maze'){mazeScene(c,g,sprite,images);return;}c.clearRect(0,0,W,H);c.fillStyle='#0a1018';c.fillRect(0,0,W,H);g.cameraX=kind==='arena'?Math.max(0,Math.min(W-worldW,g.player.x-worldW/2)):0;c.save();c.translate(-g.cameraX,0);atmosphere(c,g,kind,images);
  if(kind==='arena'){
    const p=g.player;if(g.powers?.frost){circle(c,p.x,p.y,105+g.powers.frost*14,'#70d8ef1a');c.strokeStyle='#a4efff77';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,105+g.powers.frost*14,0,Math.PI*2);c.stroke();}
    for(const gem of g.gems||[])sprite(c,'gem',gem.x,gem.y,27);
    for(const e of [...g.enemies].sort((a,b)=>a.y-b.y)){c.globalAlpha=e.hit>0?.55:1;if(e.ring){c.strokeStyle='#f19486';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,120*e.ring,0,Math.PI*2);c.stroke();}circle(c,e.x,e.y+6,e.boss?26:16,'#03060899');sprite(c,'monster',e.x,e.y,e.boss?105:55+e.type*3);c.globalAlpha=1;if(!e.boss&&e.hp<e.maxHp){c.fillStyle='#e7a093';c.fillRect(e.x-15,e.y-58,30*Math.max(0,e.hp/e.maxHp),3);}if(e.boss){label(c,e.country,e.x,e.y-96,COLORS[e.index],15);c.fillStyle='#171a21';c.fillRect(e.x-45,e.y-84,90,5);c.fillStyle=COLORS[e.index];c.fillRect(e.x-45,e.y-84,90*Math.max(0,e.hp/e.maxHp),5);}}
    if(g.powers?.ghost){c.globalAlpha=.4;sprite(c,'kais',p.x+38,p.y-20,70,g.time);c.globalAlpha=1;}
    if(g.powers?.blades)for(let i=0;i<2+g.powers.blades;i++){const a=g.time*3+i*Math.PI*2/(2+g.powers.blades);c.save();c.translate(p.x+Math.cos(a)*67,p.y+Math.sin(a)*67);c.rotate(a);c.fillStyle='#edf8fe';c.fillRect(-3,-14,6,28);c.restore();}
    for(const b of g.hazards||[]){if(b.warn>0){c.strokeStyle='#f69789';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,17,0,Math.PI*2);c.stroke();}else{circle(c,b.x,b.y,9,'#ff78534d');circle(c,b.x,b.y,4,'#ffb191');}}
    for(const b of g.bullets){circle(c,b.x,b.y,7,'#e6bc5140');circle(c,b.x,b.y,3,'#fff3a3');}
    circle(c,p.x,p.y+9,17,'#0008');if(g.auraColor){c.save();c.shadowBlur=18;c.shadowColor=g.auraColor;circle(c,p.x,p.y+8,24,g.auraColor+'33');c.restore();}c.strokeStyle=g.auraColor||'#e9cf86';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+9,22,10,0,0,Math.PI*2);c.stroke();c.globalAlpha=g.invulnerable>0?.65:1;sprite(c,'kais',p.x,p.y,70,p.moving?g.time:0,p.facing);c.globalAlpha=1;
  }
  for(const e of g.effects){c.globalAlpha=Math.min(1,e.life*2);if(e.bolt){c.strokeStyle=e.color;c.lineWidth=3;c.beginPath();c.moveTo(e.x2,e.y2);c.lineTo((e.x+e.x2)/2+12,(e.y+e.y2)/2);c.lineTo(e.x,e.y);c.stroke();}else if(e.text)label(c,e.text,e.x,e.y-(.65-e.life)*38,e.color,18);else{for(let i=0;i<6;i++){const a=i*Math.PI/3;circle(c,e.x+Math.cos(a)*(1-e.life)*30,e.y+Math.sin(a)*(1-e.life)*30,2,e.color);}}}c.globalAlpha=1;c.restore();finishScene(c,g,kind);
}
