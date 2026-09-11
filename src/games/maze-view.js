import {H as DEFAULT_HEIGHT,clamp,distance} from './core.js';
import {mazePose} from './maze-motion.js';

const TAU=Math.PI*2;
function text(c,value,x,y,size=15,color='#d4ddd8',align='left'){
  c.font=`500 ${size}px system-ui`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);
}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function glow(c,x,y,r,color){const fill=c.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,color);fill.addColorStop(1,'transparent');c.fillStyle=fill;c.fillRect(x-r,y-r,r*2,r*2);}
function ring(c,x,y,r,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();}
function panel(c,x,y,w,h){c.fillStyle='#071217ed';c.beginPath();c.roundRect(x,y,w,h,9);c.fill();c.strokeStyle='#bbd8c72a';c.lineWidth=1;c.stroke();}
function diamond(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();}

// Draw just the camera's tiles. The atlas and player frames are shared with the asset loader.
function tile(c,g,atlas,x,y,TILE){
  const index=y*g.cols+x;if(!g.seen[index])return;
  const px=x*TILE,py=y*TILE,wall=g.grid[y][x],visible=g.visible.has(index);
  c.save();c.globalAlpha=visible?1:.31;
  if(wall){
    c.fillStyle='#070c0d';c.fillRect(px+4,py+8,TILE,TILE);
    c.fillStyle='#1a292b';c.fillRect(px,py+TILE-11,TILE,13);
    if(atlas){const half=atlas.width/2,part=half/4;c.drawImage(atlas,(x%4)*part,half+(y%4)*part,part,part,px,py-5,TILE,TILE-5);}
    else{c.fillStyle='#425256';c.fillRect(px,py-5,TILE,TILE-5);}
    c.fillStyle='#465d6445';c.fillRect(px,py-5,TILE,3);c.strokeStyle='#8a9b9942';c.lineWidth=1;c.strokeRect(px+.5,py-4.5,TILE-1,TILE-6);
    if(g.grid[y+1]?.[x]===0){c.fillStyle='#0a1014ad';c.fillRect(px,py+TILE-9,TILE,13);c.fillStyle='#77918155';c.fillRect(px+2,py+TILE-10,TILE-4,2);}
  }else{
    const sanctuary=x>=1&&x<=5&&y>=1&&y<=5;
    if(atlas){const half=atlas.width/2,part=half/5;
      if(sanctuary)c.drawImage(atlas,half+(x-1)*part,half+(y-1)*part,part,part,px,py,TILE,TILE);
      else c.drawImage(atlas,((x+y)%7===0?half:0)+(x%5)*part,(y%5)*part,part,part,px,py,TILE,TILE);
    }else{c.fillStyle=sanctuary?'#6a5840':'#253c3d';c.fillRect(px,py,TILE,TILE);}
    c.fillStyle=sanctuary?'#29272035':'#071b1a50';c.fillRect(px,py,TILE,TILE);
    c.strokeStyle='#04111245';c.lineWidth=1;c.strokeRect(px,py,TILE,TILE);
    if(visible){const dim=clamp((distance({x,y},g.cell)-2)/8,0,.58);c.fillStyle=`rgba(2,10,15,${dim})`;c.fillRect(px,py,TILE,TILE);}
  }
  c.restore();
}

function mapGrid(c,g,x,y,size,{overview=false}={}){
  for(let row=0;row<g.rows;row++)for(let col=0;col<g.cols;col++){
    const at=row*g.cols+col;if(!g.seen[at])continue;
    c.fillStyle=g.grid[row][col]?'#2b4046':g.visible.has(at)?'#8daba2':'#486861';
    c.fillRect(x+col*size,y+row*size,Math.max(1,size-1),Math.max(1,size-1));
  }
  const center=p=>[x+(p.x+.5)*size,y+(p.y+.5)*size];
  const [ex,ey]=center(g.exit);ring(c,ex,ey,size*.65,'#f1ca78',2);
  for(const f of g.fragments)if(!f.collected&&g.seen[f.y*g.cols+f.x]){const[fx,fy]=center(f);diamond(c,fx,fy,Math.max(2,size*.5),f.color);}
  if(overview)for(const s of g.switches)if(g.seen[s.y*g.cols+s.x]){const[sx,sy]=center(s);text(c,s.used?'·':'+',sx,sy+4,13,'#efc582','center');}
  if(g.visible.has(g.shadow.y*g.cols+g.shadow.x)){const[sx,sy]=center(g.shadow);circle(c,sx,sy,Math.max(2,size*.35),'#ef907b');}
  const [cx,cy]=center(g.cell);circle(c,cx,cy,Math.max(2.4,size*.38),'#e6ffed');ring(c,cx,cy,Math.max(4,size*.65),'#e1fff480');
}

function explorationMap(c,g,width){
  const H=g.viewHeight||DEFAULT_HEIGHT;
  c.fillStyle='#091419';c.fillRect(0,0,width,H);
  if(H<360){
    const size=Math.min((H-30)/g.rows,12),mx=(width-g.cols*size)/2;
    panel(c,mx-7,8,g.cols*size+14,g.rows*size+14);mapGrid(c,g,mx,15,size,{overview:true});
    text(c,'CARTE DES RUINES',23,46,18,'#ede5ca');text(c,`${g.explored}% exploré`,23,75,14,'#a8c6b6');text(c,'Le temps est suspendu.',23,101,13);
    text(c,'● Kaïs   ◇ Sceau',width-210,49,14);text(c,'○ Portail',width-210,76,14,'#efd193');
    text(c,'Carte / M : revenir au jeu',width-210,H-30,12,'#bcccaa');return;
  }
  const margin=width<600?22:60,size=Math.min((width-margin*2)/g.cols,(H-290)/g.rows,17),mx=(width-g.cols*size)/2,my=154;
  text(c,'CARNET D’EXPLORATION',width/2,57,12,'#c4b58e','center');text(c,'Carte des ruines',width/2,96,30,'#edf0e2','center');
  text(c,`${g.explored}% exploré · temps suspendu`,width/2,125,15,'#9cbbb3','center');
  panel(c,mx-9,my-9,g.cols*size+18,g.rows*size+18);mapGrid(c,g,mx,my,size,{overview:true});
  const bottom=my+g.rows*size+37;
  circle(c,width/2-134,bottom-5,4,'#e6ffed');text(c,'Kaïs',width/2-122,bottom,13);
  ring(c,width/2-48,bottom-5,6,'#f1ca78',2);text(c,'Portail',width/2-35,bottom,13);
  diamond(c,width/2+58,bottom-5,5,'#c1aff0');text(c,'Sceau',width/2+72,bottom,13);
  text(c,'Les zones inconnues se révèlent en marchant.',width/2,bottom+38,13,'#92aaa5','center');
  text(c,'Revenir au jeu : bouton Carte ou touche M',width/2,bottom+62,13,'#d6c797','center');
}

export function mazeScene(c,g,sprite,images){
  const width=g.viewWidth||900,H=g.viewHeight||DEFAULT_HEIGHT,TILE=H<360?42:52;if(g.mapOpen){explorationMap(c,g,width);return;}
  const pose=mazePose(g.motion,g.renderAlpha??1),atlas=images['maze-ruins.webp'],hero=pose,shade=g.displayShadow||g.shadow;
  const camX=clamp((hero.x+.5)*TILE-width/2,0,g.cols*TILE-width),camY=clamp((hero.y+.5)*TILE-H/2,0,g.rows*TILE-H);
  const point=p=>({x:(p.x+.5)*TILE,y:(p.y+.5)*TILE});
  c.fillStyle='#080f14';c.fillRect(0,0,width,H);c.save();c.translate(-camX,-camY);
  const x0=Math.max(0,Math.floor(camX/TILE)-1),y0=Math.max(0,Math.floor(camY/TILE)-1),x1=Math.min(g.cols,Math.ceil((camX+width)/TILE)+1),y1=Math.min(g.rows,Math.ceil((camY+H)/TILE)+1);
  // Ground before raised walls keeps entrances readable at every camera position.
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(!g.grid[y][x])tile(c,g,atlas,x,y,TILE);
  for(const p of g.trail){if(!g.visible.has(p.y*g.cols+p.x))continue;const q=point(p);circle(c,q.x,q.y,2,'#b9d4c54a');}
  if(g.echoTime>0){c.save();c.globalAlpha=Math.min(1,g.echoTime);for(let i=0;i<g.echo.length;i++){const q=point(g.echo[i]);glow(c,q.x,q.y,17,'#eaca8055');diamond(c,q.x,q.y,3+Math.sin(g.time*4-i)*.8,'#f8da88');}c.restore();}
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(g.grid[y][x])tile(c,g,atlas,x,y,TILE);
  const exit=point(g.exit);
  if(g.visible.has(g.exit.y*g.cols+g.exit.x)){
    glow(c,exit.x,exit.y,125,g.collected===3?'#bdeac74a':'#d4a84935');ring(c,exit.x,exit.y,42,g.collected===3?'#bcebc9':'#e5ca8580',2);
    for(let i=0;i<3;i++){const a=i*TAU/3-Math.PI/2;diamond(c,exit.x+Math.cos(a)*46,exit.y+Math.sin(a)*46,5,g.fragments[i].collected?g.fragments[i].color:'#70674d');}
    sprite(c,'portal',exit.x,exit.y+13,g.collected===3?101:82);
  }
  for(const f of g.fragments){if(f.collected||!g.visible.has(f.y*g.cols+f.x))continue;const q=point(f),bob=g.reducedMotion?0:Math.sin(g.time*2)*3;
    glow(c,q.x,q.y,85,f.color+'44');ring(c,q.x,q.y+5,24,f.color+'9a');ring(c,q.x,q.y+5,30,f.color+'44');
    c.save();c.translate(q.x,q.y-9+bob);c.rotate(Math.PI/4);c.fillStyle='#172f32';c.fillRect(-17,-17,34,34);c.strokeStyle=f.color;c.lineWidth=2;c.strokeRect(-17,-17,34,34);c.restore();
    text(c,f.symbol,q.x,q.y-2+bob,18,f.color,'center');
    if(distance(g.cell,f)<3.3)text(c,f.name,q.x,q.y+51,14,f.color,'center');
  }
  for(const l of g.lamps){if(l.collected||!g.visible.has(l.y*g.cols+l.x))continue;const q=point(l);glow(c,q.x,q.y,56,'#eda95565');
    c.fillStyle='#534b38';c.fillRect(q.x-8,q.y-13,16,26);c.fillStyle='#e9c36e';c.fillRect(q.x-5,q.y-8,10,16);ring(c,q.x,q.y-16,5,'#b39c65',2);circle(c,q.x,q.y,3,'#fff3bc');
  }
  for(const s of g.switches){if(!g.visible.has(s.y*g.cols+s.x))continue;const q=point(s);c.fillStyle='#314541';c.fillRect(q.x-12,q.y-10,24,22);c.strokeStyle=s.used?'#759587':'#d9b46b';c.lineWidth=4;c.beginPath();c.moveTo(q.x,q.y+6);c.lineTo(q.x+(s.used?7:-7),q.y-14);c.stroke();circle(c,q.x+(s.used?7:-7),q.y-14,4,s.used?'#759587':'#e7cb89');
    if(!s.used&&distance(s,g.cell)<2)text(c,'PASSAGE · E',q.x,q.y+34,12,'#efd6a1','center');
  }
  const p=point(hero);
  if(g.visible.has(g.shadow.y*g.cols+g.shadow.x)){
    const q=point(shade);glow(c,q.x,q.y,60,g.shadowStun>0?'#98dacc44':'#dd725b33');circle(c,q.x,q.y+12,17,'#02070bcc');
    c.save();c.globalAlpha=g.shadowStun>0?.55:.9;sprite(c,'monster',q.x,q.y+11,65);c.restore();
    if(g.shadowMode==='hunt')text(c,'!',q.x,q.y-62,24,'#f1997a','center');
  }
  glow(c,p.x,p.y,70,'#dceab51c');circle(c,p.x,p.y+13,14,'#020709b0');ring(c,p.x,p.y+9,15,g.auraColor||'#dce9bb8c');
  c.save();c.globalAlpha=g.invulnerable>0&&!g.reducedMotion?.55+.35*Math.sin(g.time*26):1;const figure=images['kais-maze.webp'];if(figure)c.drawImage(figure,pose.frame*160,pose.direction*192,160,192,p.x-37.5,p.y+9-90*.7970911628290045,75,90);c.restore();
  if(g.flash>0){const progress=1-g.flash/1.8;c.save();c.globalAlpha=1-progress;ring(c,p.x,p.y,25+progress*175,'#f3d997',2);ring(c,p.x,p.y,18+progress*135,'#c8eed88c');c.restore();}
  c.restore();
  // Camera frame: current place, discrete threat and a map of discoveries only.
  const room=g.rooms.find(r=>Math.abs(r.x-g.cell.x)<=2&&Math.abs(r.y-g.cell.y)<=2);
  const title=room?.name||'Les galeries',compact=H<360;panel(c,16,compact?8:16,width<600?222:265,compact?46:62);text(c,title,30,compact?29:42,compact?15:18,'#ebe5d1');
  text(c,g.sanctuary()?'ZONE SÛRE':g.shadowMode==='hunt'?'L’OMBRE T’A REPÉRÉ':'TROUVE LES SCEAUX',30,compact?45:63,11,g.shadowMode==='hunt'?'#f4a48b':'#a5c1b2');
  const size=width<600?3.5:4.4,mw=g.cols*size,mh=g.rows*size;panel(c,width-mw-24,16,mw+10,mh+10);mapGrid(c,g,width-mw-19,21,size);
  if(g.lamp<40){panel(c,width/2-133,H-77,266,36);text(c,'Lumière faible · cherche une lanterne',width/2,H-54,13,'#f1c47d','center');}
  if(!g.reducedMotion)for(let i=0;i<15;i++)circle(c,(i*97.31+Math.sin(g.time*.24+i)*12)%width,(i*53.13-g.time*3+H*100)%H,1,'#aec7b62b');
}
