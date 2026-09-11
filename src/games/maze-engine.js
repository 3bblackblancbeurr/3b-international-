import {BaseGame,shuffle,clamp,distance} from './core.js';
import {mazeDifficulty,readMazeCampaign,mazePerk,completeMazeLevel} from './maze-campaign.js';
import {createMazeMotion,stepMazeMotion} from './maze-motion.js';

export const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
export const SEALS=[{name:'Mémoire',color:'#efca81',symbol:'I'},{name:'Courage',color:'#8bded6',symbol:'II'},{name:'Lien',color:'#c1aff0',symbol:'III'}];
export function paths(grid,start){
  const rows=grid.length,cols=grid[0].length,dist=Array(rows*cols).fill(-1),parent=Array(rows*cols).fill(-1),q=[];
  if(grid[start.y]?.[start.x]!==0)return{dist,parent,q};
  q.push(start.y*cols+start.x);dist[q[0]]=0;
  for(let k=0;k<q.length;k++){
    const at=q[k],x=at%cols,y=Math.floor(at/cols);
    for(const[dx,dy]of DIRS){const nx=x+dx,ny=y+dy,i=ny*cols+nx;
      if(nx<0||ny<0||nx>=cols||ny>=rows||grid[ny][nx]||dist[i]>=0)continue;
      dist[i]=dist[at]+1;parent[i]=at;q.push(i);
    }
  }
  return{dist,parent,q};
}
export function makeMaze(cols,rows,random){
  const grid=Array.from({length:rows},()=>Array(cols).fill(1)),stack=[[1,1]];grid[1][1]=0;
  while(stack.length){
    const[x,y]=stack.at(-1),d=shuffle(DIRS,random).find(([dx,dy])=>{const nx=x+dx*2,ny=y+dy*2;return nx>0&&ny>0&&nx<cols-1&&ny<rows-1&&grid[ny][nx]===1;});
    if(!d){stack.pop();continue;}
    grid[y+d[1]][x+d[0]]=0;grid[y+d[1]*2][x+d[0]*2]=0;stack.push([x+d[0]*2,y+d[1]*2]);
  }
  return grid;
}
// The wall surface can be seen, but cells behind it and closed diagonal corners cannot.
export function lineOfSight(grid,a,b){
  let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=Math.sign(b.x-x),sy=Math.sign(b.y-y),err=dx-dy;
  while(x!==b.x||y!==b.y){
    const twice=2*err,oldX=x,oldY=y;
    if(twice>-dy){err-=dy;x+=sx;}if(twice<dx){err+=dx;y+=sy;}
    if(x!==oldX&&y!==oldY&&grid[oldY]?.[x]!==0&&grid[y]?.[oldX]!==0)return false;
    if(x===b.x&&y===b.y)return true;
    if(grid[y]?.[x]!==0)return false;
  }
  return true;
}
function wallsToOpen(grid){
  const out=[];
  for(let y=2;y<grid.length-2;y++)for(let x=2;x<grid[0].length-2;x++){
    if(grid[y][x]!==1)continue;
    const horizontal=!grid[y][x-1]&&!grid[y][x+1],vertical=!grid[y-1][x]&&!grid[y+1][x];
    if(horizontal||vertical)out.push({x,y,adjacent:horizontal?{x:x-1,y}:{x,y:y-1}});
  }
  return out;
}

export class Maze extends BaseGame{
  constructor(seed,saved=null,level=saved?.selected||1){
    const campaign=readMazeCampaign(saved),difficulty=mazeDifficulty(level);
    super(seed??difficulty.seed);this.campaign=campaign;this.stageNumber=difficulty.level;this.campaign.selected=this.stageNumber;this.difficulty=difficulty;this.perk=mazePerk(campaign);this.pulseRecharge=difficulty.recharge-this.perk.recharge;this.maxLight=250+this.perk.light;this.cols=difficulty.cols;this.rows=difficulty.rows;this.grid=makeMaze(this.cols,this.rows,this.random);
    this.rooms=[{x:3,y:3,name:'Le sanctuaire'},{x:this.cols-4,y:3,name:'Le cloître'},{x:this.cols-4,y:this.rows-4,name:'Les archives'},{x:3,y:this.rows-4,name:'Le jardin oublié'}];
    for(const room of this.rooms)for(let y=room.y-2;y<=room.y+2;y++)for(let x=room.x-2;x<=room.x+2;x++)this.grid[y][x]=0;
    // Loops offer escape routes. Optional shortcuts only add passages, never remove a route.
    for(const gate of shuffle(wallsToOpen(this.grid),this.random).slice(0,difficulty.loops))this.grid[gate.y][gate.x]=0;
    this.cell={x:3,y:3};this.motion=createMazeMotion(this.cell);this.displayCell=this.motion.position;this.exit={...this.cell};
    this.fragments=this.rooms.slice(1).map((p,i)=>({...SEALS[i],x:p.x,y:p.y,collected:false}));
    this.shadow={x:this.cols-4,y:this.rows-6};this.displayShadow={...this.shadow};this.shadowMode='patrol';this.shadowStun=0;this.shadowMemory=0;this.lastKnown=null;this.patrolIndex=0;this.shadowClock=0;
    this.collected=0;this.lamp=difficulty.light+this.perk.light;this.vision=difficulty.vision;this.moveClock=0;this.moving=false;this.invulnerable=0;this.hits=0;this.flash=0;this.flashCooldown=0;this.echo=[];this.echoTime=0;this.trail=[];this.seen=Array(this.cols*this.rows).fill(false);this.visible=new Set();this.explored=0;this.mapOpen=false;this.steps=0;this.messageTime=0;
    const occupied=new Set([this.exit,...this.fragments,this.shadow].map(p=>p.y*this.cols+p.x));
    const route=paths(this.grid,this.cell),remote=route.q.filter(i=>route.dist[i]>9);this.lamps=[];
    for(const fraction of [.12,.28,.46,.65,.84].slice(0,difficulty.lamps)){
      const start=Math.floor(remote.length*fraction),index=[...remote.slice(start),...remote.slice(0,start)].find(i=>!occupied.has(i));
      if(index!==undefined){occupied.add(index);this.lamps.push({x:index%this.cols,y:Math.floor(index/this.cols),collected:false});}
    }
    this.switches=[];
    for(const gate of shuffle(wallsToOpen(this.grid),this.random)){
      const i=gate.adjacent.y*this.cols+gate.adjacent.x;
      if(occupied.has(i)||distance(gate,this.exit)<6)continue;
      this.switches.push({...gate.adjacent,gate:{x:gate.x,y:gate.y},used:false});occupied.add(i);if(this.switches.length===2)break;
    }
    this.walkable=this.grid.flat().filter(t=>!t).length;
    this.say('Retrouve les trois sceaux, puis reviens au portail du sanctuaire.');this.reveal();
  }
  say(message){this.message=message;this.messageTime=5;}
  sanctuary(point=this.displayCell){return distance(point,this.exit)<=2.3;}
  reveal(force=false){
    const key=`${this.cell.x}:${this.cell.y}:${Math.floor(this.vision*4)}:${this.flash>0}:${this.walkable}`;if(!force&&key===this.visibilityKey)return;this.visibilityKey=key;
    this.visible=new Set();const radius=this.vision+(this.flash>0?2:0);
    for(let y=Math.max(0,this.cell.y-8);y<=Math.min(this.rows-1,this.cell.y+8);y++)for(let x=Math.max(0,this.cell.x-8);x<=Math.min(this.cols-1,this.cell.x+8);x++){
      if(distance({x,y},this.cell)<=radius&&lineOfSight(this.grid,this.cell,{x,y})){this.visible.add(y*this.cols+x);this.seen[y*this.cols+x]=true;}
    }
    this.explored=Math.round(this.seen.filter((s,i)=>s&&!this.grid[Math.floor(i/this.cols)][i%this.cols]).length/this.walkable*100);
  }
  toggleMap(){if(!['playing','map'].includes(this.status))return;this.mapOpen=!this.mapOpen;this.status=this.mapOpen?'map':'playing';this.moving=false;}
  nearbySwitch(){return this.switches.find(s=>!s.used&&Math.abs(s.x-this.cell.x)+Math.abs(s.y-this.cell.y)<=1);}
  nearestGoal(){const route=paths(this.grid,this.cell),goals=this.fragments.filter(f=>!f.collected);return goals.length?goals.sort((a,b)=>route.dist[a.y*this.cols+a.x]-route.dist[b.y*this.cols+b.x])[0]:this.exit;}
  guide(){
    const goal=this.nearestGoal(),route=paths(this.grid,goal);let at=this.cell.y*this.cols+this.cell.x;
    this.echo=[];for(let n=0;n<7;n++){at=route.parent[at];if(at<0)break;this.echo.push({x:at%this.cols,y:Math.floor(at/this.cols)});this.seen[at]=true;}this.echoTime=4;
  }
  repel(){
    const fromPlayer=paths(this.grid,this.cell),fromShadow=paths(this.grid,this.shadow);
    const candidates=fromShadow.q.filter(i=>fromShadow.dist[i]<=4&&!this.sanctuary({x:i%this.cols,y:Math.floor(i/this.cols)}));
    const far=candidates.sort((a,b)=>fromPlayer.dist[b]-fromPlayer.dist[a])[0];
    if(far!==undefined)this.shadow={x:far%this.cols,y:Math.floor(far/this.cols)};
    this.shadowStun=2.6;this.lastKnown=null;this.shadowMemory=0;this.shadowMode='stunned';
  }
  action(){
    if(this.status!=='playing')return;
    const sw=this.nearbySwitch();
    if(sw){sw.used=true;this.grid[sw.gate.y][sw.gate.x]=0;this.walkable++;this.score+=80;this.cue('secret');this.say('Le passage secret est ouvert. Ce raccourci restera accessible.');this.reveal();return;}
    if(this.flashCooldown>0||this.lamp<=12)return;
    this.lamp-=12;this.flash=1.8;this.flashCooldown=this.pulseRecharge;this.guide();this.cue('pulse');
    const route=paths(this.grid,this.cell),steps=route.dist[this.shadow.y*this.cols+this.shadow.x],near=steps>=0&&steps<=8;if(near)this.repel();
    this.say(near?'L’ombre recule ! Les traces dorées te guident vers le prochain sceau.':'Suis les traces dorées. Elles indiquent le début du chemin vers ton objectif.');this.reveal(true);
  }
  move(dt,input){
    const previous=this.cell,result=stepMazeMotion(this.motion,this.grid,input,dt);this.cell=result.cell;this.displayCell=this.motion.position;this.moving=this.motion.moving;
    if(previous.x!==this.cell.x||previous.y!==this.cell.y){this.trail.push(previous);if(this.trail.length>30)this.trail.shift();this.steps++;}
  }
  snapshot(){return structuredClone(this.campaign);}
  finish(won,message){
    if(this.status==='ended')return;
    if(won){const result=completeMazeLevel(this.campaign,this.stageNumber,{score:this.score,time:this.time,hits:this.hits});this.campaign=result.campaign;this.firstClear=result.first;this.stars=result.stars;}
    this.moving=false;this.motion.moving=false;super.finish(won,message);
  }
  updateShadow(dt){
    this.shadowStun=Math.max(0,this.shadowStun-dt);this.shadowMemory=Math.max(0,this.shadowMemory-dt);this.shadowClock-=dt;
    if(this.time<this.difficulty.grace||this.shadowStun>0){this.shadowMode=this.shadowStun>0?'stunned':'patrol';return;}if(this.shadowClock>0)return;
    const route=paths(this.grid,this.cell),steps=route.dist[this.shadow.y*this.cols+this.shadow.x],sees=distance(this.shadow,this.cell)<this.difficulty.sight&&lineOfSight(this.grid,this.shadow,this.cell);
    if(!this.sanctuary()&&(sees||(this.moving&&steps>=0&&steps<=this.difficulty.hearing))){this.lastKnown={...this.cell};this.shadowMemory=5;this.shadowMode=sees?'hunt':'search';}
    else if(this.shadowMemory>0&&this.lastKnown)this.shadowMode='search';else{this.lastKnown=null;this.shadowMode='patrol';}
    let target=this.lastKnown;
    if(!target){const patrol=this.rooms.slice(1);if(distance(this.shadow,patrol[this.patrolIndex])<1)this.patrolIndex=(this.patrolIndex+1)%patrol.length;target=patrol[this.patrolIndex];}
    const path=paths(this.grid,target),next=path.parent[this.shadow.y*this.cols+this.shadow.x];
    if(next>=0){const position={x:next%this.cols,y:Math.floor(next/this.cols)};if(!this.sanctuary(position))this.shadow=position;}
    this.shadowClock=this.shadowMode==='hunt'?this.difficulty.hunt:this.shadowMode==='search'?this.difficulty.search:this.difficulty.patrol;
  }
  update(dt,input={}){
    if(this.status!=='playing')return;
    this.tick(dt);this.messageTime=Math.max(0,this.messageTime-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.flash=Math.max(0,this.flash-dt);this.flashCooldown=Math.max(0,this.flashCooldown-dt);this.echoTime=Math.max(0,this.echoTime-dt);this.moveClock-=dt;
    this.lamp=Math.max(0,this.lamp-dt*(this.sanctuary()?.25:this.difficulty.drain));this.vision=clamp(3.8+this.lamp/100,3.8,this.difficulty.vision);
    this.move(dt,input);
    const ease=1-Math.exp(-dt*22);for(const key of ['x','y']){this.displayShadow[key]+=(this.shadow[key]-this.displayShadow[key])*ease;}
    for(const f of this.fragments)if(!f.collected&&distance(f,this.displayCell)<.15){f.collected=true;this.collected++;this.lamp=Math.min(this.maxLight,this.lamp+30);this.player.hp=Math.min(100,this.player.hp+34);this.score+=200;this.cue('collect');this.say(`Sceau de ${f.name.toLowerCase()} retrouvé. ${this.collected===3?'Le portail est ouvert : retourne au sanctuaire.':`${this.collected} / 3. Ta lumière et ta vitalité sont restaurées.`}`);}
    for(const l of this.lamps)if(!l.collected&&distance(l,this.displayCell)<.15){l.collected=true;this.lamp=Math.min(this.maxLight,this.lamp+38);this.score+=25;this.cue('collect');this.say('Une lanterne préservée : +38 unités de lumière.');}
    this.updateShadow(dt);
    if(this.flash<=0&&this.invulnerable<=0&&!this.sanctuary()&&distance(this.shadow,this.displayCell)<.38){
      this.hits++;this.player.hp=Math.max(0,this.player.hp-this.difficulty.damage);this.lamp=Math.max(0,this.lamp-12);this.invulnerable=2.2;this.repel();this.cue('damage');this.say('L’ombre t’a touché. Profite de ce répit pour t’éloigner.');
      if(this.player.hp<=0){this.finish(false,'L’ombre a emporté tes dernières forces. Cache-toi derrière les murs et garde un éclat pour les rencontres.');return;}
    }
    if(this.collected===3&&distance(this.displayCell,this.exit)<.15){this.score+=Math.round(this.lamp*3)+Math.max(0,3-this.hits)*100;this.finish(true,'Les trois sceaux ont rouvert le sanctuaire. Tu as traversé l’Oubli.');this.cue('victory');return;}
    if(this.lamp<=0){this.finish(false,'Ta lumière s’est éteinte. Les lanternes et chaque sceau la rechargent ; la carte permet de préparer ton trajet sans perdre de temps.');return;}
    this.reveal();
  }
  hud(){return [['Sceaux',`${this.collected} / 3`],['Lumière',Math.ceil(this.lamp)],['Vitalité','♥'.repeat(Math.ceil(this.player.hp/34))||'—'],['Ombre',{patrol:'En veille',hunt:'Te poursuit',search:'Te cherche',stunned:'Repoussée'}[this.shadowMode]]];}
}
