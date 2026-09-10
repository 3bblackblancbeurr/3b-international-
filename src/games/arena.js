import {BaseGame,W,H,COUNTRIES,COLORS,POWERS,clamp,distance,movePlayer,shuffle} from './core.js';
export class Arena extends BaseGame {
  constructor(seed){super(seed);this.enemies=[];this.bullets=[];this.gems=[];this.powers={};this.level=1;this.xp=0;this.need=7;this.kills=0;this.guardians=0;this.spawnClock=0;this.shotClock=0;this.lightClock=0;this.dash=0;this.invulnerable=0;this.bossAt=40;this.bossIndex=0;this.title='Kaïs contre les Ombres';}
  spawn(boss=false){const side=Math.floor(this.random()*4),i=this.bossIndex,type=Math.floor(this.random()*3),hp=boss?540+i*160:(type===2?60:27)+this.time*.16;const e={x:side<2?(side===0?10:W-10):this.random()*W,y:side>=2?(side===2?10:H-10):this.random()*H,hp,maxHp:hp,speed:boss?85+i*5:(type===1?143:80)+this.random()*20+this.time*.09,boss,type,phase:this.random()*6,hit:0,shot:3+this.random()*2};if(distance(e,this.player)<140){e.x=W-e.x;e.y=H-e.y;}if(boss){e.country=COUNTRIES[i];e.index=i;this.bossIndex++;this.message='Gardien de '+e.country;this.effect(W/2,90,COLORS[i],this.message);}this.enemies.push(e);}
  damage(e,value){e.hp-=value;e.hit=.14;}
  shot(origin,damage=20){let target;let d=Infinity;for(const e of this.enemies){const n=distance(origin,e);if(n<d){d=n;target=e;}}if(!target)return;const a=Math.atan2(target.y-origin.y,target.x-origin.x);this.bullets.push({x:origin.x,y:origin.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,life:1.8,damage});}
  action(){if(this.status!=='playing'||this.dash>0)return;this.dash=2.8;this.invulnerable=.48;this.effect(this.player.x,this.player.y,'#85dcf4','Esquive');}
  choose(id){if(this.status!=='upgrade'||!this.choices.some(p=>p.id===id))return;this.powers[id]=(this.powers[id]||0)+1;if(id==='heart'){this.player.maxHp+=20;this.player.hp=Math.min(this.player.maxHp,this.player.hp+50);}this.status='playing';}
  update(dt,input={}){
    if(this.status!=='playing')return;this.tick(dt);const p=this.player;
    this.dash=Math.max(0,this.dash-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);movePlayer(p,input,dt,this.invulnerable>.2?420:205);
    this.spawnClock-=dt;if(this.spawnClock<=0){const count=this.time>120?3:this.time>14?2:1;for(let n=0;n<count&&this.enemies.length<145;n++)this.spawn();this.spawnClock=Math.max(.27,.68-this.time/750);}
    if(this.time>=this.bossAt&&this.bossIndex<8&&!this.enemies.some(e=>e.boss)){this.spawn(true);this.bossAt+=42;}
    this.shotClock-=dt;if(this.shotClock<=0){this.shot(p,24+this.level*3);if(this.powers.ghost)this.shot({x:p.x+38,y:p.y-20},18*this.powers.ghost+this.level*2);this.shotClock=Math.max(.12,.58-(this.powers.magnet||0)*.065-this.level*.011);}
    this.lightClock-=dt;if(this.lightClock<=0){if(this.powers.lightning){for(const e of [...this.enemies].sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,2+this.powers.lightning*2)){this.damage(e,40+this.powers.lightning*22);this.effects.push({x:e.x,y:e.y,x2:p.x,y2:p.y,color:'#a7d8ff',life:.3,bolt:true});}}this.lightClock=2.2;}
    for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of this.enemies){if(e.hp>0&&distance(b,e)<(e.boss?31:17)){this.damage(e,b.damage);b.life=0;break;}}}this.bullets=this.bullets.filter(b=>b.life>0);
    for(const e of this.enemies){if(e.hp<=0)continue;let d=distance(e,p);let speed=e.speed;if(this.powers.frost&&d<105+this.powers.frost*14){speed*=.48;this.damage(e,dt*6*this.powers.frost);}if(this.powers.blades&&d<83){this.damage(e,dt*(27+20*this.powers.blades));}
      const tx=p.x+(e.type===1?(input.x||0)*65:0),ty=p.y+(e.type===1?(input.y||0)*65:0);const a=Math.atan2(ty-e.y,tx-e.x);const weave=e.type===1?Math.sin(this.time*2+e.phase)*.25:0;e.x+=Math.cos(a+weave)*speed*dt;e.y+=Math.sin(a+weave)*speed*dt;e.hit=Math.max(0,e.hit-dt);
      e.shot-=dt;if((e.boss||e.type===2)&&this.time>12&&e.shot<=0){this.hazards??=[];const rays=e.boss?5:1;for(let j=0;j<rays;j++){const angle=a+(j-(rays-1)/2)*.24;this.hazards.push({x:e.x,y:e.y,vx:Math.cos(angle)*(e.boss?175:140),vy:Math.sin(angle)*(e.boss?175:140),life:4,warn:.55});}e.shot=e.boss?2.7:4.5;}
      if(e.boss&&e.index%3===1){const phase=this.time%4;e.ring=phase<1.3?phase/1.3:0;if(phase>=1.3&&phase<1.3+dt&&d<120&&this.invulnerable<=0){p.hp-=12;this.invulnerable=.6;}}
      if(d<(e.boss?36:25)&&this.invulnerable<=0){p.hp-=e.boss?16:8;this.invulnerable=.75;this.effect(p.x,p.y,'#f79a99','−'+(e.boss?16:8));}
    }
    for(const e of this.enemies.filter(e=>e.hp<=0)){this.kills++;this.score+=e.boss?500:10;this.gems.push({x:e.x,y:e.y,value:e.boss?12:1});this.effect(e.x,e.y,e.boss?COLORS[e.index]:'#759ba1');if(e.boss){this.guardians++;p.hp=Math.min(p.maxHp,p.hp+24);this.effect(e.x,e.y,'#efd076','Gardien libéré');}}
    this.enemies=this.enemies.filter(e=>e.hp>0);
    this.hazards??=[];for(const b of this.hazards){b.warn-=dt;if(b.warn>0)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(distance(b,p)<20&&this.invulnerable<=0){p.hp-=12;this.invulnerable=.7;b.life=0;this.effect(p.x,p.y,'#fa938b','−12');}}this.hazards=this.hazards.filter(b=>b.life>0);
    for(const g of this.gems){const d=distance(g,p);if(d<105+(this.powers.magnet||0)*65){g.x+=(p.x-g.x)*dt*7;g.y+=(p.y-g.y)*dt*7;}if(d<23){this.xp+=g.value;g.collected=true;}}this.gems=this.gems.filter(g=>!g.collected).slice(-240);
    if(p.hp<=0){p.hp=0;this.finish(false,'Les ombres ont repris la place. Tes records sont conservés.');return;}
    if(this.guardians===8){this.finish(true,'Les huit gardiens sont libérés. Le Cercle Brisé retrouve sa lumière.');return;}
    if(this.time>=540){this.finish(false,'La nuit est tombée. Reviens avec une nouvelle combinaison de pouvoirs.');return;}
    if(this.xp>=this.need){this.xp-=this.need;this.need=Math.ceil(this.need*1.24);this.level++;this.choices=shuffle(POWERS,this.random).slice(0,3);this.status='upgrade';}
  }
  hud(){return [['Vie',`${Math.ceil(this.player.hp)} / ${this.player.maxHp}`],['Niveau',this.level],['Gardiens',`${this.guardians} / 8`],['Temps',`${Math.floor(this.time/60)}:${String(Math.floor(this.time%60)).padStart(2,'0')}`]];}
}
