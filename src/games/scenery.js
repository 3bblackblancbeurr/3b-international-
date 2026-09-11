import {W,H,COLORS,clamp,distance} from './core.js';
import {edges} from './cities.js';

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
  const tint={arena:'#05131b35',tower:'#140e2be0',refuge:g.phase==='night'?'#05132465':'#493b1e22',cities:'#082a2aed',maze:'#070f16'}[kind];
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
  const width=g.viewWidth||(kind==='cities'?620:W);
  if(!g.reducedMotion)for(let i=0;i<24;i++){
    const x=(i*97.31+Math.sin(g.time*.24+i)*16)%width,y=(i*53.13-g.time*(3+i%4)+H*100)%H;
    disc(c,x,y,1+i%2*.5,kind==='cities'?'#cbdf9d44':'#afdafa33');
  }
  const v=c.createRadialGradient(width/2,H*.48,H*.27,width/2,H*.5,H*.78);v.addColorStop(0,'transparent');v.addColorStop(1,'#030a1485');c.fillStyle=v;c.fillRect(0,0,width,H);
  if(kind==='arena'){
    panel(c,16,16,width-32,42);text(c,`NIVEAU ${g.level}`,30,43,14,'#f2db9d','left');bar(c,134,34,width-252,g.xp/g.need,'#82e1dd',8);text(c,`${g.xp} / ${g.need}`,width-30,43,14,'#b9d3db','right');
    if(g.combo>=10){text(c,`×${Math.min(4,1+Math.floor(g.combo/10))}  ·  ${g.combo} OMBRES`,width/2,88,22,'#ffe0a0');bar(c,width/2-65,96,130,g.comboTime/3,'#f3c56e',3);}
    const boss=g.enemies.find(e=>e.boss);if(boss){panel(c,width/2-150,H-75,300,54);text(c,'GARDIEN · '+boss.country.toUpperCase(),width/2,H-51,14,COLORS[boss.index]);bar(c,width/2-132,H-39,264,boss.hp/boss.maxHp,COLORS[boss.index]);}
  }
  if(kind==='refuge'){
    const target=g.contextAction();if(target.target){const camera=g.cameraX||0;glow(c,target.target.x-camera,target.target.y,70,'#d3f5aa33');text(c,target.label,target.target.x-camera,target.target.y+46,18,'#e7f9c4');}
    panel(c,16,16,width-32,46);text(c,g.phase==='day'?'PRÉPARATION DU REFUGE':'DÉFENDRE JUSQU’À L’AUBE',width/2,38,15,g.phase==='day'?'#f7de9e':'#a4d1fc');bar(c,32,49,width-64,g.phaseTime/150,g.phase==='day'?'#f2cb7e':'#8dbfff',3);
  }
  if(['arena','refuge'].includes(kind)){
    const camera=g.cameraX||0;for(const enemy of g.enemies){const x=enemy.x-camera;if(x>15&&x<width-15)continue;const px=clamp(x,16,width-16),py=clamp(enemy.y,115,H-100);disc(c,px,py,enemy.boss?8:4,enemy.boss?'#ffd491':'#ef8c81');}
    bar(c,width/2-46,H-16,92,g.player.hp/g.player.maxHp,g.player.hp<30?'#ff887d':'#b0e7bd',4);
  }
}

export function towerScene(c,g,sprite){
  const floor=c.createLinearGradient(0,220,0,H);floor.addColorStop(0,'#352945');floor.addColorStop(1,'#101927');c.fillStyle=floor;c.fillRect(0,220,W,H-220);
  for(let i=0;i<11;i++)line(c,W/2,190,(i-1)*112,H,'#b5a3c510');
  for(let i=0;i<7;i++){const y=230+i*i*9;line(c,0,y,W,y,'#b5a3c516');}
  for(const x of [50,850]){glow(c,x,255,170,'#d8914135');sprite(c,'watchtower',x,470,300);}
  panel(c,300,20,300,64);text(c,`ÉTAGE ${String(g.floor).padStart(2,'0')} / 15`,W/2,48,21);text(c,g.room==='combat'?'LE GARDIEN DU PASSAGE':g.room==='resolved'?'PASSAGE OUVERT':'CHOISIS TON DESTIN',W/2,69,12,'#c7b7d6');
  if(g.room==='combat'){
    const urgent=g.enemy.windup<=.55,attacking=g.strike>.38,impact=g.enemy.hit>0;
    glow(c,560,340,190,urgent?'#d955493f':'#8571bd28');
    c.save();if(impact)c.globalAlpha=.65;sprite(c,'monster',560+(impact?Math.sin(g.enemy.hit*90)*9:0),440,215);c.restore();
    const px=270+(attacking?(g.strike-.38)*130:0);sprite(c,'kais',px,475,180,g.time);
    if(attacking){c.strokeStyle='#fff1c8';c.lineWidth=5;c.beginPath();c.arc(px+42,380,75,-1.2,1.1);c.stroke();}
    if(g.block>0){glow(c,px+15,395,105,g.counter>0?'#fceac466':'#86dcef44');c.strokeStyle='#a8edff';c.lineWidth=3;c.beginPath();c.ellipse(px+20,400,58,90,0,0,TAU);c.stroke();}
    bar(c,440,139,240,g.enemy.hp/g.enemy.maxHp,'#e08b9f',10);text(c,'OMBRE · '+Math.ceil(g.enemy.hp)+' / '+g.enemy.maxHp,560,125,14,'#e5bed0');
    panel(c,200,505,500,83);text(c,g.counter>0?'CONTRE-ATTAQUE ×2':urgent?'PARE MAINTENANT':'OBSERVE SON ATTAQUE',450,532,22,g.counter>0?'#ffdfa0':urgent?'#ffb2a0':'#d4d6e6');
    const ratio=1-g.enemy.windup/(g.enemy.interval||2.8);bar(c,230,548,440,ratio,'#c7b2e5',10);c.fillStyle='#99e3d18a';c.fillRect(230+440*.86,548,440*.14,10);text(c,'Frapper : Espace  ·  Parer : F  ·  Zone verte : parade parfaite',450,578,14,'#afc5d4');
  }else{
    const colors={treasure:'#eaca83',trap:'#ef967d',combat:'#d594b0',secret:'#b9a3f2',rest:'#8bddbf'};
    for(let i=0;i<3;i++){
      const x=185+i*265,d=g.doors[i],color=colors[d.type];const selected=g.selectedDoor===i;
      c.save();if(g.room==='resolved'&&!selected)c.globalAlpha=.3;
      glow(c,x,310,145,color+'32');sprite(c,'portal',x,435,286+(selected?8:0));
      panel(c,x-103,448,206,60);text(c,String(i+1).padStart(2,'0'),x,477,24,color);text(c,{treasure:'TRÉSOR',trap:'PIÈGE',combat:'COMBAT',secret:'SOUVENIR',rest:'SANCTUAIRE'}[d.type],x,496,12,color);
      c.restore();
    }
    sprite(c,'kais',450,605,95,g.reducedMotion?0:g.time*.3);
  }
}

export function mazeScene(c,g,sprite,images){
  c.fillStyle='#071019';c.fillRect(0,0,W,H);
  const s=35,ox=(W-g.cols*s)/2,oy=(H-g.rows*s)/2,p=g.cell,display=g.displayCell||p,width=g.viewWidth||W,zoom=1.75;
  g.layout={s,ox,oy};c.save();c.translate(width/2-(ox+(display.x+.5)*s)*zoom,H/2-(oy+(display.y+.5)*s)*zoom);c.scale(zoom,zoom);
  for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++){
    const d=Math.hypot(x-p.x,y-p.y),seen=g.seen[y*g.cols+x];if(!seen&&d>g.vision)continue;
    const wall=g.grid[y][x],px=ox+x*s,py=oy+y*s,lit=d<g.vision;
    c.fillStyle=wall?(lit?'#304859':'#142533'):(lit?'#1a303c':'#0b1923');c.fillRect(px,py,s,s);
    const im=images['ground-atlas.webp'];if(im&&lit){c.globalAlpha=wall?.45:.17;c.drawImage(im,wall?0:im.width/4,wall?0:im.height/2,im.width/4,im.height/2,px,py,s,s);c.globalAlpha=1;}
    if(wall){line(c,px+1,py+1,px+s-1,py+1,lit?'#92b3be55':'#36546555',2);c.fillStyle='#020a1480';c.fillRect(px,py+s-6,s,6);}
  }
  for(const t of g.trail){disc(c,ox+(t.x+.5)*s,oy+(t.y+.5)*s,1.6,'#dac99555');}
  const at=o=>[ox+(o.x+.5)*s,oy+(o.y+.65)*s];
  for(const o of g.fragments)if(!o.collected&&g.seen[o.y*g.cols+o.x]){const[x,y]=at(o);glow(c,x,y-8,38,'#ffd68244');sprite(c,'gem',x,y,s*1.2);}
  for(const o of g.lamps)if(!o.collected&&g.seen[o.y*g.cols+o.x]){const[x,y]=at(o);glow(c,x,y-5,36,'#7afce85f');disc(c,x,y-5,5,'#adfff1');}
  for(const o of g.switches)if(g.seen[o.y*g.cols+o.x]){const[x,y]=at(o);text(c,o.used?'✓':'⊕',x,y,24,o.used?'#778f99':'#d2baff');}
  if(g.seen[g.exit.y*g.cols+g.exit.x]){const[x,y]=at(g.exit);glow(c,x,y-7,48,g.collected===3?'#92ffe550':'#b3b9de22');sprite(c,'portal',x,y,s*1.7);}
  if(distance(g.shadow,p)<g.vision+1){const[x,y]=at(g.shadow);glow(c,x,y-8,45,'#fd706f44');sprite(c,'monster',x,y,s*1.7);}
  const[x,y]=at(display);glow(c,x,y-8,100,'#f8db8f20');sprite(c,'kais',x,y,s*1.55,g.moveClock>0?g.time:0);
  if(g.flash>0){c.strokeStyle='#b8f4ffbb';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(x,y-8,((3-g.flash)*100+i*36)%150,0,TAU);c.stroke();}}
  c.restore();
  // A discovered-only map never reveals unexplored corridors or rewards.
  const ms=width<600?3.5:4.4,mw=g.cols*ms,mh=g.rows*ms,mx=width-mw-25,my=30;panel(c,mx-9,my-9,mw+18,mh+35);
  for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++)if(g.seen[y*g.cols+x]){c.fillStyle=g.grid[y][x]?'#466172':'#142737';c.fillRect(mx+x*ms,my+y*ms,ms,ms);}
  const mark=(o,color)=>{if(g.seen[o.y*g.cols+o.x])disc(c,mx+(o.x+.5)*ms,my+(o.y+.5)*ms,2.7,color);};
  g.fragments.filter(f=>!f.collected).forEach(f=>mark(f,'#ffe39a'));mark(g.exit,'#a8dbcb');mark(p,'#fff');text(c,`${g.explored}% EXPLORÉ`,mx+mw/2,my+mh+18,12,'#b7d0dc');
  if(distance(g.shadow,p)<5){panel(c,width/2-130,H-68,260,40);text(c,'L’OMBRE EST PROCHE',width/2,H-42,16,'#ffa89e');}
}

export function refugeScene(c,g,sprite){
  const day=g.phase==='day';
  glow(c,450,300,260,day?'#e7c97525':'#e5af5d32');
  c.fillStyle=day?'#585847aa':'#273b3fbb';c.beginPath();c.ellipse(450,340,186,131,0,0,TAU);c.fill();
  for(let i=0;i<8;i++){const x=305+i*42;if(i===3||i===4)continue;sprite(c,'barrier',x,423,65);}
  for(let i=0;i<6;i++)sprite(c,'barrier',313+i*54,222,68);
  sprite(c,'monument',450,293,122);
  for(let i=0;i<g.homes;i++){const x=370+i%3*80,y=340+Math.floor(i/3)*57;glow(c,x,y-15,38,'#ffca6438');sprite(c,'house',x,y,69);}
  for(let i=0;i<g.turrets;i++){const x=315+i%2*270,y=220+Math.floor(i/2)*170;sprite(c,'watchtower',x,y,98);glow(c,x,y-35,45,'#91cdef30');}
  bar(c,362,439,176,g.gate/100,g.gate<35?'#f59582':'#9ce4bd',7);text(c,'PORTE · '+Math.ceil(g.gate)+'%',450,465,15,'#d6dfc7');
  for(const n of g.nodes)if(n.amount>0){sprite(c,'rubble',n.x,n.y,75);if(day){text(c,n.amount+' matériaux',n.x,n.y+34,16,'#e1d4b8');if(distance(g.player,n)<85)glow(c,n.x,n.y,65,'#ffe6ad3a');}}
  for(let i=0;i<Math.min(g.people,10);i++){const angle=i*2.4+(g.reducedMotion?0:g.time*.13);sprite(c,'kais',450+Math.cos(angle)*(42+i%3*13),320+Math.sin(angle)*32,25,day?g.time*.3:0);}
  if(g.resident){glow(c,g.resident.x,g.resident.y,70,'#ffe0a14d');sprite(c,'kais',g.resident.x,g.resident.y,66,g.time*.3);text(c,'À SECOURIR',g.resident.x,g.resident.y-73,16);}
}

function cityTile(c,t,x,y,s,sprite,active=true,ghost=false,time=0){
  c.save();if(ghost)c.globalAlpha=.65;
  c.fillStyle=active?'#324e4d':'#253c40';c.beginPath();c.roundRect(x+2,y+5,s-4,s-3,5);c.fill();
  c.fillStyle={road:'#48584c',house:'#405855',garden:'#355a49',monument:'#5c604d'}[t.type];c.beginPath();c.roundRect(x+2,y+1,s-4,s-6,5);c.fill();
  if(t.type==='road'){
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    for(const d of edges(t)){const[dx,dy]=dirs[d];line(c,x+s/2,y+s/2,x+s/2+dx*s/2,y+s/2+dy*s/2,'#253d3a',19);line(c,x+s/2,y+s/2,x+s/2+dx*s/2,y+s/2+dy*s/2,active?'#d4c39b':'#8c9688',12);}
    disc(c,x+s/2,y+s/2,6,active?'#d4c39b':'#8c9688');
    if(active&&!ghost){const d=edges(t)[0],v=dirs[d],progress=(time*.22+x*.01)%1;disc(c,x+s/2+v[0]*(progress-.5)*s,y+s/2+v[1]*(progress-.5)*s,2.6,'#f6ead0');}
  }else{
    if(active)glow(c,x+s/2,y+s*.6,s*.52,t.type==='garden'?'#aeec9a22':'#ffe1962a');
    c.globalAlpha*=active?1:.55;sprite(c,t.type,x+s/2,y+s*.85,s*.91);c.globalAlpha=ghost?.65:1;
  }
  c.strokeStyle=active?'#c9e4bc64':'#78928b33';c.lineWidth=1;c.beginPath();c.roundRect(x+3,y+2,s-6,s-7,4);c.stroke();c.restore();
}

export function citiesScene(c,g,sprite){
  const width=620,s=76,ox=44,oy=42;g.layout={s,ox,oy};
  const bg=c.createLinearGradient(0,0,620,620);bg.addColorStop(0,'#102d39');bg.addColorStop(1,'#183d33');c.fillStyle=bg;c.fillRect(0,0,620,H);
  glow(c,330,250,340,COLORS[g.countryIndex]+'15');
  const connected=new Set(g.connected),preview=g.preview();
  for(let y=0;y<7;y++)for(let x=0;x<7;x++){
    const t=g.board[y*7+x],px=ox+x*s,py=oy+y*s;
    if(t)cityTile(c,t,px,py,s,sprite,connected.has(y*7+x),false,g.reducedMotion?0:g.time);
    else{c.fillStyle='#7ea59610';c.beginPath();c.roundRect(px+3,py+3,s-6,s-6,5);c.fill();c.strokeStyle='#94c9b118';c.lineWidth=1;c.stroke();if(g.canPlace(x,y))text(c,'+',px+s/2,py+s*.62,22,'#85ae9c');}
  }
  if(preview){const {x,y}=g.cursor;cityTile(c,preview.tile,ox+x*s,oy+y*s,s,sprite,preview.connected,true);}
  if(g.cursor){c.strokeStyle=preview?.connected?'#f6dfa1':'#90cde0';c.lineWidth=3;c.beginPath();c.roundRect(ox+g.cursor.x*s+2,oy+g.cursor.y*s+2,s-4,s-4,6);c.stroke();}
  text(c,g.cityName.toUpperCase(),46,28,19,COLORS[g.countryIndex],'left');text(c,g.turn+' TUILES POSÉES',575,28,13,'#bad3c5','right');
  text(c,g.restored?'✦ VILLE RESTAURÉE ✦':'RECONSTRUIS LES LIENS ENTRE LES QUARTIERS',width/2,H-15,15,g.restored?'#ffe0a1':'#afcebb');
}
