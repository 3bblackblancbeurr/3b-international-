import {W,H,COLORS,clamp} from './core.js';

const TAU=Math.PI*2;
function text(c,value,x,y,size=18,color='#f2dfb0',align='center'){c.font=`600 ${size}px system-ui`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);}
function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function glow(c,x,y,r,color){const fill=c.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,color);fill.addColorStop(1,'transparent');c.fillStyle=fill;c.fillRect(x-r,y-r,r*2,r*2);}
function line(c,x,y,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function panel(c,x,y,w,h){c.fillStyle='#07131cdd';c.beginPath();c.roundRect(x,y,w,h,10);c.fill();c.strokeStyle='#b2d9e12b';c.lineWidth=1;c.stroke();}
function bar(c,x,y,w,value,color,h=6){c.fillStyle='#050c17';c.fillRect(x,y,w,h);c.fillStyle=color;c.fillRect(x,y,w*clamp(value,0,1),h);}

export function atmosphere(c,g,kind,images){
  const bg=images['night-plaza.webp'];
  if(bg){const drift=g.reducedMotion?0:Math.sin(g.time*.09)*7;c.drawImage(bg,-12+drift,-10,W+24,H+20);}
  const tint='#05131b35';
  c.fillStyle=tint;c.fillRect(0,0,W,H);
  if(kind==='arena'){
    c.save();c.translate(W/2,H/2);c.scale(1,.72);c.strokeStyle='#e3c67822';c.lineWidth=2;
    for(const r of [180,204,278]){c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}
    for(let i=0;i<8;i++){const a=i*TAU/8;line(c,Math.cos(a)*180,Math.sin(a)*180,Math.cos(a)*278,Math.sin(a)*278,COLORS[i]+'44',2);}
    c.restore();
    for(const t of g.trail||[])glow(c,t.x,t.y,25,`rgba(120,220,255,${t.life*1.5})`);
  }
}

export function finishScene(c,g,kind){
  const width=g.viewWidth||W;
  if(!g.reducedMotion)for(let i=0;i<24;i++){
    const x=(i*97.31+Math.sin(g.time*.24+i)*16)%width,y=(i*53.13-g.time*(3+i%4)+H*100)%H;
    disc(c,x,y,1+i%2*.5,'#afdafa33');
  }
  const v=c.createRadialGradient(width/2,H*.48,H*.27,width/2,H*.5,H*.78);v.addColorStop(0,'transparent');v.addColorStop(1,'#030a1485');c.fillStyle=v;c.fillRect(0,0,width,H);
  if(kind==='arena'){
    panel(c,16,16,width-32,42);text(c,`NIVEAU ${g.level}`,30,43,14,'#f2db9d','left');bar(c,134,34,width-252,g.xp/g.need,'#82e1dd',8);text(c,`${g.xp} / ${g.need}`,width-30,43,14,'#b9d3db','right');
    if(g.combo>=10){text(c,`×${Math.min(4,1+Math.floor(g.combo/10))}  ·  ${g.combo} OMBRES`,width/2,88,22,'#ffe0a0');bar(c,width/2-65,96,130,g.comboTime/3,'#f3c56e',3);}
    const boss=g.enemies.find(e=>e.boss);if(boss){panel(c,width/2-150,H-75,300,54);text(c,'GARDIEN · '+boss.country.toUpperCase(),width/2,H-51,14,COLORS[boss.index]);bar(c,width/2-132,H-39,264,boss.hp/boss.maxHp,COLORS[boss.index]);}
  }
  if(kind==='arena'){
    const camera=g.cameraX||0;for(const enemy of g.enemies){const x=enemy.x-camera;if(x>15&&x<width-15)continue;const px=clamp(x,16,width-16),py=clamp(enemy.y,115,H-100);disc(c,px,py,enemy.boss?8:4,enemy.boss?'#ffd491':'#ef8c81');}
    bar(c,width/2-46,H-16,92,g.player.hp/g.player.maxHp,g.player.hp<30?'#ff887d':'#b0e7bd',4);
  }
}
