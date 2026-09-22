import React,{useEffect,useMemo,useRef,useState} from 'react';
import './key-race.css';

const STORAGE_KEY='3b-key-race-v2';
const STAGES=[
 {id:'fr',flag:'🇫🇷',country:'FRANCE',city:'PARIS',accent:'#2aa8ff',label:'Les quais'},
 {id:'ee',flag:'🇪🇪',country:'ESTONIE',city:'TALLINN',accent:'#6fc7ff',label:'Les remparts'},
 {id:'es',flag:'🇪🇸',country:'ESPAGNE',city:'MADRID',accent:'#ffcc4d',label:'La plaza'},
 {id:'it',flag:'🇮🇹',country:'ITALIE',city:'ROME',accent:'#63d18b',label:'Les ruines'},
 {id:'ma',flag:'🇲🇦',country:'MAROC',city:'RABAT',accent:'#ff6d6d',label:'La médina'},
 {id:'dz',flag:'🇩🇿',country:'ALGÉRIE',city:'ALGER',accent:'#72e6a2',label:'La baie'},
 {id:'tn',flag:'🇹🇳',country:'TUNISIE',city:'TUNIS',accent:'#ff7f7f',label:'La porte blanche'},
 {id:'tr',flag:'🇹🇷',country:'TURQUIE',city:'ISTANBUL',accent:'#ff6262',label:'Le détroit'},
];

function blankSave(){return{completed:0,best:Array(STAGES.length).fill(0),fragments:0,shadows:0};}
function readSave(){
 try{
  const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(!raw||typeof raw!=='object')return blankSave();
  return{
   completed:Math.max(0,Math.min(STAGES.length,Number(raw.completed)||0)),
   best:Array.from({length:STAGES.length},(_,i)=>Math.max(0,Number(raw.best?.[i])||0)),
   fragments:Math.max(0,Number(raw.fragments)||0),
   shadows:Math.max(0,Number(raw.shadows)||0),
  };
 }catch{return blankSave();}
}
function writeSave(next){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function seededColor(index,alpha=1){
 const palette=['42,168,255','111,199,255','255,204,77','99,209,139','255,109,109','114,230,162','255,127,127','255,98,98'];
 return `rgba(${palette[index%palette.length]},${alpha})`;
}

function makeRun(stageIndex){
 return{
  stageIndex,
  elapsed:0,
  timeLeft:60,
  distance:0,
  targetDistance:3200+stageIndex*120,
  score:0,
  lives:3,
  fragments:0,
  shadows:0,
  spawnIn:.9,
  throwReadyAt:0,
  player:{y:0,vy:0,jumps:0,dodgeX:0,slideUntil:0,invUntil:0},
  enemies:[],
  knives:[],
  sparks:[],
  boss:null,
  bossSpawned:false,
  ended:false,
 };
}

export default function KeyRace3B({onBack}){
 const [save,setSave]=useState(readSave);
 const [stageIndex,setStageIndex]=useState(()=>Math.min(readSave().completed,STAGES.length-1));
 const [phase,setPhase]=useState('intro');
 const [hud,setHud]=useState({score:0,timeLeft:60,fragments:0,shadows:0,lives:3,boss:0,progress:0});
 const canvasRef=useRef(null);
 const runRef=useRef(null);
 const rafRef=useRef(0);
 const stage=STAGES[stageIndex];

 const unlocked=useMemo(()=>Math.min(STAGES.length,Math.max(1,save.completed+1)),[save.completed]);

 useEffect(()=>{
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[]);

 function syncHud(run){
  setHud({
   score:Math.round(run.score),
   timeLeft:Math.max(0,Math.ceil(run.timeLeft)),
   fragments:run.fragments,
   shadows:run.shadows,
   lives:run.lives,
   boss:run.boss?.health??0,
   progress:clamp(run.distance/run.targetDistance,0,1),
  });
 }

 function start(nextIndex=stageIndex){
  const idx=clamp(nextIndex,0,STAGES.length-1);
  setStageIndex(idx);
  const run=makeRun(idx);
  runRef.current=run;
  syncHud(run);
  setPhase('playing');
 }

 function resetProgress(){
  const fresh=blankSave();
  writeSave(fresh);
  setSave(fresh);
  setStageIndex(0);
  setPhase('intro');
 }

 function jump(){
  const run=runRef.current;
  if(!run||phase!=='playing'||run.ended)return;
  const p=run.player;
  if(p.jumps>=2)return;
  p.vy=p.jumps===0?590:520;
  p.jumps+=1;
 }

 function slide(){
  const run=runRef.current;
  if(!run||phase!=='playing'||run.ended)return;
  run.player.slideUntil=performance.now()+620;
 }

 function dodge(direction){
  const run=runRef.current;
  if(!run||phase!=='playing'||run.ended)return;
  run.player.dodgeX=direction*58;
 }

 function throwKnife(){
  const run=runRef.current,canvas=canvasRef.current;
  if(!run||!canvas||phase!=='playing'||run.ended)return;
  const now=performance.now();
  if(now<run.throwReadyAt)return;
  run.throwReadyAt=now+300;
  const w=canvas.getBoundingClientRect().width||800;
  run.knives.push({x:w*.23+run.player.dodgeX,y:run.player.y+34,vx:690,life:1.5});
 }

 useEffect(()=>{
  if(phase!=='playing')return;
  const down=e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
   if(e.repeat&&e.key!=='f'&&e.key!=='F')return;
   if(['ArrowUp',' ','w','W','z','Z'].includes(e.key)){e.preventDefault();jump();}
   else if(['ArrowDown','s','S'].includes(e.key)){e.preventDefault();slide();}
   else if(['ArrowLeft','q','Q','a','A'].includes(e.key)){e.preventDefault();dodge(-1);}
   else if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();dodge(1);}
   else if(['f','F','Enter'].includes(e.key)){e.preventDefault();throwKnife();}
  };
  window.addEventListener('keydown',down);
  return()=>window.removeEventListener('keydown',down);
 },[phase]);

 useEffect(()=>{
  if(phase!=='playing')return;
  const canvas=canvasRef.current;
  const ctx=canvas?.getContext('2d');
  const run=runRef.current;
  if(!canvas||!ctx||!run)return;

  let last=performance.now(),hudTimer=0;
  const resize=()=>{
   const rect=canvas.getBoundingClientRect();
   const dpr=Math.min(window.devicePixelRatio||1,2);
   canvas.width=Math.max(1,Math.round(rect.width*dpr));
   canvas.height=Math.max(1,Math.round(rect.height*dpr));
  };
  resize();
  const ro=new ResizeObserver(resize);
  ro.observe(canvas);

  const endStage=won=>{
   if(run.ended)return;
   run.ended=true;
   cancelAnimationFrame(rafRef.current);
   if(won){
    const nextSave={
     ...save,
     completed:Math.max(save.completed,run.stageIndex+1),
     best:save.best.map((v,i)=>i===run.stageIndex?Math.max(v,Math.round(run.score)):v),
     fragments:save.fragments+run.fragments,
     shadows:save.shadows+run.shadows,
    };
    writeSave(nextSave);
    setSave(nextSave);
    setPhase(run.stageIndex===STAGES.length-1?'complete':'stage-clear');
   }else{
    setPhase('game-over');
   }
  };

  function spawnEnemy(w){
   const type=Math.random()<.22?'heavy':'shadow';
   run.enemies.push({
    x:w+50,
    y:0,
    w:type==='heavy'?48:34,
    h:type==='heavy'?58:44,
    speed:245+run.stageIndex*12+(type==='heavy'?-28:Math.random()*50),
    hp:type==='heavy'?2:1,
    type,
    hit:false,
   });
  }

  function hitPlayer(now){
   if(now<run.player.invUntil)return;
   run.lives-=1;
   run.player.invUntil=now+1350;
   run.score=Math.max(0,run.score-120);
   run.sparks.push({kind:'hit',x:.23,y:.69,life:.45});
   if(run.lives<=0)endStage(false);
  }

  function loop(now){
   const rect=canvas.getBoundingClientRect();
   const w=Math.max(320,rect.width),h=Math.max(420,rect.height);
   const dt=Math.min(.035,(now-last)/1000||0);
   last=now;
   run.elapsed+=dt;
   run.timeLeft=60-run.elapsed;
   if(run.timeLeft<=0){endStage(false);return;}

   const p=run.player;
   p.vy-=1380*dt;
   p.y+=p.vy*dt;
   if(p.y<=0){p.y=0;p.vy=0;p.jumps=0;}
   p.dodgeX*=Math.pow(.025,dt);
   if(Math.abs(p.dodgeX)<.5)p.dodgeX=0;

   const stageSpeed=132+run.stageIndex*6;
   const bossBlocking=run.boss&&!run.boss.dead;
   if(!bossBlocking||run.distance<run.targetDistance*.91)run.distance+=stageSpeed*dt;

   run.spawnIn-=dt;
   if(run.spawnIn<=0&&!bossBlocking){
    spawnEnemy(w);
    run.spawnIn=.75+Math.random()*.9;
   }

   if(!run.bossSpawned&&run.distance>=run.targetDistance*.74){
    run.bossSpawned=true;
    run.boss={x:w*.83,health:12,max:12,flashUntil:0,dead:false};
   }

   const ground=h*.79;
   const playerX=w*.22+p.dodgeX;
   const sliding=now<p.slideUntil;
   const playerH=sliding?30:54;
   const playerY=ground-p.y-playerH;

   for(const enemy of run.enemies){
    enemy.x-=enemy.speed*dt;
    const ex=enemy.x,ey=ground-enemy.h;
    const overlap=ex<playerX+34&&ex+enemy.w>playerX-18&&ey<playerY+playerH&&ey+enemy.h>playerY;
    if(overlap&&!enemy.hit){
      enemy.hit=true;
      hitPlayer(now);
    }
   }

   for(const knife of run.knives){
    knife.x+=knife.vx*dt;
    knife.life-=dt;
    const ky=ground-knife.y;
    for(const enemy of run.enemies){
      if(enemy.hp<=0)continue;
      const ey=ground-enemy.h;
      if(knife.x>enemy.x&&knife.x<enemy.x+enemy.w&&ky>ey&&ky<ground){
        knife.life=0;
        enemy.hp-=1;
        if(enemy.hp<=0){
          run.shadows+=1;
          run.fragments+=1;
          run.score+=enemy.type==='heavy'?180:110;
          run.sparks.push({kind:'burst',x:enemy.x/w,y:ey/h,life:.4});
        }
        break;
      }
    }
    if(run.boss&&!run.boss.dead&&knife.life>0){
      const bx=run.boss.x,bw=78,bh=100,by=ground-bh;
      if(knife.x>bx&&knife.x<bx+bw&&ky>by&&ky<ground){
        knife.life=0;
        run.boss.health-=1;
        run.boss.flashUntil=now+90;
        run.score+=75;
        if(run.boss.health<=0){
          run.boss.dead=true;
          run.score+=900;
          run.fragments+=3;
          run.sparks.push({kind:'boss',x:bx/w,y:by/h,life:.8});
        }
      }
    }
   }

   run.enemies=run.enemies.filter(e=>e.x>-100&&e.hp>0);
   run.knives=run.knives.filter(k=>k.life>0&&k.x<w+120);
   for(const s of run.sparks)s.life-=dt;
   run.sparks=run.sparks.filter(s=>s.life>0);

   run.score+=dt*(18+run.stageIndex*2);
   if(run.distance>=run.targetDistance&&(!run.boss||run.boss.dead)){endStage(true);return;}

   draw(ctx,w,h,run,now,playerX,playerY,playerH,ground,stage);
   hudTimer+=dt;
   if(hudTimer>.09){hudTimer=0;syncHud(run);}
   rafRef.current=requestAnimationFrame(loop);
  }

  rafRef.current=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(rafRef.current);ro.disconnect();};
 },[phase,stageIndex,stage,save]);

 return <section className="keyrace" style={{'--key-accent':stage.accent}}>
  <header className="keyrace-topbar">
   <button type="button" className="keyrace-back" onClick={onBack}>← Retour Jeux 3B</button>
   <div className="keyrace-stage-title"><span>{stage.flag}</span><strong>{String(stageIndex+1).padStart(2,'0')} / {stage.country} · {stage.city}</strong></div>
   <div className="keyrace-keys" aria-label="Clés récupérées">{STAGES.map((s,i)=><span key={s.id} data-done={i<save.completed}>◆</span>)}</div>
  </header>

  <div className="keyrace-hud" aria-live="polite">
   <div><small>SCORE</small><strong>{hud.score.toLocaleString('fr-FR')}</strong></div>
   <div><small>TEMPS</small><strong>{hud.timeLeft}s</strong></div>
   <div><small>FRAGMENTS</small><strong>{hud.fragments}</strong></div>
   <div><small>OMBRES</small><strong>{hud.shadows}</strong></div>
   <div><small>CHANCES</small><strong>{'●'.repeat(hud.lives)}{'○'.repeat(Math.max(0,3-hud.lives))}</strong></div>
  </div>

  <div className="keyrace-stage">
   <canvas
    ref={canvasRef}
    aria-label={`La Course des 8 Clés — ${stage.country}`}
    onPointerDown={e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();jump();}}
   />
   <div className="keyrace-progress" aria-label="Progression de la porte"><span style={{width:`${hud.progress*100}%`}}/></div>
   {phase==='playing'&&hud.boss>0&&<div className="keyrace-bossbar"><span>MONSTRE DE L’OUBLI</span><b>{hud.boss} / 12</b><i><em style={{width:`${hud.boss/12*100}%`}}/></i></div>}

   {phase==='intro'&&<div className="keyrace-overlay">
    <div className="keyrace-card">
     <p className="keyrace-kicker">{String(stageIndex+1).padStart(2,'0')} / {stage.country} · {stage.city}</p>
     <h1>LA COURSE<br/>DES 8 CLÉS</h1>
     <p>Double tap pour sauter. Lance tes couteaux face aux ombres. Récupère une clé dans chaque pays et reconstitue le Cercle Brisé.</p>
     <div className="keyrace-summary"><span><b>{save.completed}</b> clés</span><span><b>{save.fragments}</b> fragments</span><span><b>{save.shadows}</b> ombres</span></div>
     <button className="keyrace-primary" type="button" onClick={()=>start(stageIndex)}>JOUER</button>
     <p className="keyrace-note">60 secondes · 3 chances · progression sauvegardée sur cet appareil</p>
     <div className="keyrace-door-grid">{STAGES.map((s,i)=><button key={s.id} type="button" disabled={i>=unlocked} data-active={i===stageIndex} data-done={i<save.completed} onClick={()=>setStageIndex(i)}><span>{s.flag}</span><small>{i+1}</small></button>)}</div>
    </div>
   </div>}

   {phase==='stage-clear'&&<div className="keyrace-overlay">
    <div className="keyrace-card">
     <p className="keyrace-kicker">CLÉ RÉCUPÉRÉE</p>
     <h2>{stage.flag} {stage.country} LIBÉRÉE</h2>
     <p>La clé de {stage.city} rejoint le Cercle Brisé.</p>
     <div className="keyrace-summary"><span><b>{hud.score}</b> score</span><span><b>{hud.fragments}</b> fragments</span><span><b>{hud.shadows}</b> ombres</span></div>
     <button className="keyrace-primary" type="button" onClick={()=>start(stageIndex+1)}>PORTE SUIVANTE</button>
    </div>
   </div>}

   {phase==='game-over'&&<div className="keyrace-overlay">
    <div className="keyrace-card">
     <p className="keyrace-kicker">L’OUBLI T’A RATTRAPÉ</p>
     <h2>REPRENDS LA COURSE</h2>
     <p>Ta progression déjà gagnée reste enregistrée. Recommence seulement cette porte.</p>
     <button className="keyrace-primary" type="button" onClick={()=>start(stageIndex)}>REJOUER</button>
     <button className="keyrace-secondary" type="button" onClick={()=>setPhase('intro')}>CHOISIR UNE PORTE</button>
    </div>
   </div>}

   {phase==='complete'&&<div className="keyrace-overlay">
    <div className="keyrace-card">
     <p className="keyrace-kicker">8 / 8 · CERCLE BRISÉ</p>
     <h2>LES 8 CLÉS SONT RÉUNIES</h2>
     <p>Kaïs a traversé les huit portes. Le Cercle Brisé peut maintenant être reconstitué.</p>
     <div className="keyrace-summary"><span><b>8</b> clés</span><span><b>{save.fragments}</b> fragments</span><span><b>{save.shadows}</b> ombres</span></div>
     <button className="keyrace-primary" type="button" onClick={()=>{setStageIndex(0);setPhase('intro');}}>REJOUER LES PORTES</button>
    </div>
   </div>}
  </div>

  <footer className="keyrace-controls">
   <div><button type="button" onPointerDown={e=>{e.preventDefault();dodge(-1);}}>← ESQUIVE</button><button type="button" onPointerDown={e=>{e.preventDefault();dodge(1);}}>ESQUIVE →</button></div>
   <button type="button" className="jump" onPointerDown={e=>{e.preventDefault();jump();}}>↑ SAUT</button>
   <button type="button" onPointerDown={e=>{e.preventDefault();slide();}}>↓ GLISSER</button>
   <button type="button" className="knife" onPointerDown={e=>{e.preventDefault();throwKnife();}}>F · LANCER</button>
   <button type="button" className="keyrace-reset" onClick={resetProgress}>Réinitialiser</button>
  </footer>
 </section>;
}

function draw(ctx,w,h,run,now,playerX,playerY,playerH,ground,stage){
 const dpr=canvasScale(ctx,w,h);
 ctx.save();
 ctx.scale(dpr,dpr);
 ctx.clearRect(0,0,w,h);

 const sky=ctx.createLinearGradient(0,0,0,h);
 sky.addColorStop(0,'#03101d');
 sky.addColorStop(.55,'#07192a');
 sky.addColorStop(1,'#02060b');
 ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

 ctx.globalAlpha=.16;
 ctx.strokeStyle=stage.accent;ctx.lineWidth=1;
 for(let x=-((run.distance*.35)%48);x<w;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=42;y<h;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.globalAlpha=1;

 const skylineOffset=(run.distance*.18)%140;
 for(let i=-1;i<Math.ceil(w/140)+2;i++){
  const x=i*140-skylineOffset;
  const bh=70+((i+run.stageIndex*3)%4)*28;
  ctx.fillStyle=seededColor(run.stageIndex,.11);
  ctx.fillRect(x,ground-bh-34,90,bh);
  ctx.fillStyle=seededColor(run.stageIndex,.28);
  for(let wy=ground-bh-20;wy<ground-46;wy+=20)for(let wx=x+12;wx<x+78;wx+=20)ctx.fillRect(wx,wy,6,8);
 }

 ctx.fillStyle='#07111b';ctx.fillRect(0,ground,w,h-ground);
 ctx.fillStyle=seededColor(run.stageIndex,.32);ctx.fillRect(0,ground,w,2);
 ctx.globalAlpha=.24;ctx.fillStyle=stage.accent;
 for(let x=-((run.distance*1.8)%90);x<w;x+=90)ctx.fillRect(x,ground+14,52,2);
 ctx.globalAlpha=1;

 for(const enemy of run.enemies){
  const ey=ground-enemy.h;
  ctx.save();
  ctx.shadowBlur=18;ctx.shadowColor='rgba(0,180,255,.35)';
  ctx.fillStyle=enemy.type==='heavy'?'#15171c':'#0b1017';
  ctx.beginPath();ctx.roundRect(enemy.x,ey,enemy.w,enemy.h,enemy.type==='heavy'?9:16);ctx.fill();
  ctx.fillStyle=stage.accent;ctx.fillRect(enemy.x+enemy.w*.25,ey+12,5,3);ctx.fillRect(enemy.x+enemy.w*.62,ey+12,5,3);
  ctx.restore();
 }

 if(run.boss&&!run.boss.dead){
  const b=run.boss,bw=78,bh=100,by=ground-bh;
  b.x=Math.max(w*.66,Math.min(w*.83,b.x));
  ctx.save();
  ctx.shadowBlur=now<b.flashUntil?42:22;ctx.shadowColor=now<b.flashUntil?'#ffffff':stage.accent;
  ctx.fillStyle=now<b.flashUntil?'#eef8ff':'#080b10';
  ctx.beginPath();ctx.roundRect(b.x,by,bw,bh,22);ctx.fill();
  ctx.fillStyle=stage.accent;ctx.fillRect(b.x+20,by+24,10,5);ctx.fillRect(b.x+48,by+24,10,5);
  ctx.strokeStyle=stage.accent;ctx.lineWidth=2;ctx.strokeRect(b.x-6,by-6,bw+12,bh+12);
  ctx.restore();
 }

 for(const knife of run.knives){
  const ky=ground-knife.y;
  ctx.save();ctx.translate(knife.x,ky);ctx.rotate(run.elapsed*18);
  ctx.fillStyle='#eaf7ff';ctx.fillRect(-10,-2,18,4);
  ctx.fillStyle='#d8b36a';ctx.fillRect(7,-3,7,6);ctx.restore();
 }

 for(const spark of run.sparks){
  const sx=spark.x*w,sy=spark.y*h;
  ctx.globalAlpha=clamp(spark.life/.8,0,1);
  ctx.fillStyle=spark.kind==='hit'?'#ff6a6a':stage.accent;
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+run.elapsed;
    const r=(1-spark.life)*38+12;
    ctx.fillRect(sx+Math.cos(a)*r,sy+Math.sin(a)*r,4,4);
  }
  ctx.globalAlpha=1;
 }

 const inv=now<run.player.invUntil;
 ctx.save();
 ctx.globalAlpha=inv&&Math.floor(now/80)%2===0?.35:1;
 ctx.translate(playerX,playerY);
 ctx.shadowBlur=20;ctx.shadowColor=stage.accent;
 ctx.fillStyle='#dcecff';
 if(playerH<40){
  ctx.beginPath();ctx.roundRect(-4,10,48,22,10);ctx.fill();
  ctx.fillStyle='#081321';ctx.fillRect(23,14,16,6);
 }else{
  ctx.beginPath();ctx.arc(17,9,9,0,Math.PI*2);ctx.fill();
  ctx.fillRect(8,18,18,25);
  ctx.strokeStyle='#dcecff';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(12,40);ctx.lineTo(5,54);ctx.moveTo(22,40);ctx.lineTo(31,54);ctx.stroke();
  ctx.strokeStyle=stage.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(9,24);ctx.lineTo(30,30);ctx.stroke();
 }
 ctx.restore();

 ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='600 12px system-ui,sans-serif';
 ctx.fillText(stage.label.toUpperCase(),18,28);
 ctx.fillStyle=stage.accent;ctx.font='700 11px system-ui,sans-serif';
 ctx.fillText(`PORTE ${String(run.stageIndex+1).padStart(2,'0')} · ${stage.country}`,18,46);

 ctx.restore();
}

function canvasScale(ctx,w,h){
 const canvas=ctx.canvas;
 const sx=canvas.width/Math.max(1,w),sy=canvas.height/Math.max(1,h);
 return Math.max(1,Math.min(sx,sy));
}
