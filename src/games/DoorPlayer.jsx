import React,{useEffect,useRef,useState} from 'react';
import {X,Volume2,VolumeX,Pause,Play,Maximize,Heart,Sparkles,KeyRound,Gem,FlaskConical,Map} from 'lucide-react';
import {Tower} from './tower.js';
import {doorUnlocked} from './door-campaign.js';
import {DoorCampaign,DoorResult} from './DoorCampaign.jsx';
import {DoorChoices,DoorCombat,DoorRunes,DoorMechanism,DoorBoon,DoorGate} from './DoorScenes.jsx';
import {loadDoorAssets,drawDoorEncounter} from './door-view.js';
import {createStepper} from './runtime.js';
import {createGameAudio} from './audio.js';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {useGameRewards} from '../loyalty/useGameRewards.js';
import './door.css';

export default function DoorPlayer({saved,onClose,onBenefits,onCheckpoint,saveMessage}){
 const engine=useRef(null);if(!engine.current)engine.current=new Tower(undefined,saved);
 const shell=useRef(),content=useRef(),canvas=useRef(),needle=useRef(),audio=useRef(),pausedRef=useRef(false),readyRef=useRef(false),activity=useRef(Date.now()),checkpointRef=useRef(onCheckpoint),counted=useRef(false);
 checkpointRef.current=onCheckpoint;
 const [started,setStarted]=useState(false),[paused,setPaused]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[sound,setSound]=useState(false),[,refresh]=useState(0),[notice,setNotice]=useState('');
 const account=useLoyalty(),rewards=useGameRewards('tower',engine,pausedRef,readyRef,activity),g=engine.current;
 const updateView=()=>refresh(n=>n+1);
 const invoke=(name,...args)=>{if(!readyRef.current||pausedRef.current||engine.current.status!=='playing')return;activity.current=Date.now();engine.current[name]?.(...args);updateView();};
 const pause=()=>{if(!readyRef.current||engine.current.status==='ended')return;pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);};
 const begin=()=>{readyRef.current=true;pausedRef.current=false;setPaused(false);setStarted(true);activity.current=Date.now();shell.current.focus();content.current.scrollTop=0;};
 const replace=(level,restart=false,start=true)=>{const old=engine.current;engine.current=new Tower(undefined,old.snapshot(),level,{restart});counted.current=false;checkpointRef.current(engine.current,'tower',false);pausedRef.current=false;setPaused(false);readyRef.current=start;setStarted(start);updateView();content.current.scrollTop=0;shell.current.focus();};
 const select=level=>{if(level>=1&&level<=doorUnlocked(engine.current.campaign)&&level!==engine.current.stageNumber)replace(level,false,false);};
 const levels=()=>{if(engine.current.status==='ended'){replace(engine.current.campaign.selected,false,false);return;}readyRef.current=false;pausedRef.current=false;setPaused(false);setStarted(false);content.current.scrollTop=0;};
 const retry=()=>{setError('');loadDoorAssets().then(()=>setLoaded(true)).catch(e=>setError(e.message));};
 useEffect(()=>{
  let live=true;audio.current=createGameAudio();loadDoorAssets().then(()=>{if(live)setLoaded(true);}).catch(e=>{if(live)setError(e.message);});
  const previous=document.activeElement,root=document.getElementById('root'),overflow=document.body.style.overflow;if(root)root.inert=true;document.body.style.overflow='hidden';shell.current.focus();
  const persist=(record=false)=>{const game=engine.current;if(record){if(counted.current||game.time<.15)return;counted.current=true;}checkpointRef.current(game,'tower',record);};
  const stepper=createStepper(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let frame,last=0,hud=0,lastFeedback=0,lastThreshold=engine.current.savedThreshold,lastRoom=engine.current.room;
  const loop=now=>{const dt=Math.min(.2,(now-last)/1000||0);last=now;const game=engine.current;
   if(readyRef.current&&!pausedRef.current&&game.status==='playing')stepper.advance(dt,step=>{game.update(step);return game.status==='playing';});else stepper.reset();
   if(game.feedbackId!==lastFeedback){lastFeedback=game.feedbackId;audio.current?.note(game.feedback);}
   if(game.status==='ended'&&!counted.current)persist(true);else if(game.savedThreshold!==lastThreshold){lastThreshold=game.savedThreshold;persist(false);}
   if(game.room!==lastRoom){lastRoom=game.room;content.current.scrollTop=0;}
   if(canvas.current)drawDoorEncounter(canvas.current,game,reduced.matches);
   if(needle.current&&game.lock)needle.current.style.left=(game.lock.position*100)+'%';
   hud+=dt;if(hud>.08){hud=0;updateView();}frame=requestAnimationFrame(loop);
  };frame=requestAnimationFrame(loop);
  const down=e=>{
   if(e.key==='Tab'){const buttons=[...shell.current.querySelectorAll('button:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]')),first=buttons[0],lastButton=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===shell.current)){e.preventDefault();lastButton?.focus();}else if(!e.shiftKey&&document.activeElement===lastButton){e.preventDefault();first?.focus();}return;}
   if(e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.target.closest('button,summary')&&['Enter',' '].includes(e.key))return;
   const k=e.key.toLowerCase();if(['escape','p'].includes(k)){e.preventDefault();pause();return;}
   if(!readyRef.current||pausedRef.current)return;
   const game=engine.current;if(['1','2','3'].includes(k)){e.preventDefault();activity.current=Date.now();if(game.room==='doors')game.selectDoor(Number(k)-1);else if(game.room==='combat')game.combatAction(['attack','guard','break'][Number(k)-1]);}
   else if(['enter',' '].includes(k)){e.preventDefault();activity.current=Date.now();if(k==='enter')game.confirm();else game.action();}updateView();
  };
  const blur=()=>{if(readyRef.current&&engine.current.status==='playing'){pausedRef.current=true;setPaused(true);}};
  const visibility=()=>{if(document.hidden)blur();},pagehide=()=>persist(false),timer=setInterval(()=>persist(false),12000);
  window.addEventListener('keydown',down);window.addEventListener('blur',blur);window.addEventListener('pagehide',pagehide);document.addEventListener('visibilitychange',visibility);
  return()=>{live=false;cancelAnimationFrame(frame);clearInterval(timer);persist(engine.current.time>.15);window.removeEventListener('keydown',down);window.removeEventListener('blur',blur);window.removeEventListener('pagehide',pagehide);document.removeEventListener('visibilitychange',visibility);audio.current?.close();document.body.style.overflow=overflow;if(root)root.inert=false;previous?.focus();};
 },[]);
 const inPlay=started&&!paused&&g.status==='playing';
 return <div className="door-shell" ref={shell} tabIndex={-1} role="dialog" aria-modal="true" aria-label="La Porte interdite" data-state={!started?'intro':paused?'paused':g.status} data-room={g.room}>
  <header className="door-header"><button onClick={onClose} aria-label="Quitter le jeu"><X size={20}/></button><div><strong>La Porte interdite</strong><span>Niveau {g.stageNumber} / 100 · {g.difficulty.title}</span></div><nav aria-label="Réglages du jeu"><button onClick={()=>{setSound(!sound);audio.current?.set(!sound);audio.current?.note();}} aria-label={sound?'Couper le son':'Activer le son'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="door-fullscreen" aria-label="Plein écran" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else shell.current.requestFullscreen?.().catch(()=>setNotice('Le plein écran n’est pas disponible ici.'));}}><Maximize size={18}/></button><button disabled={!started||g.status==='ended'} onClick={pause} aria-label={paused?'Reprendre':'Pause'}>{paused?<Play size={19}/>:<Pause size={19}/>}</button></nav></header>
  {started&&<div className="door-hud"><div><Heart size={16}/><span>Vitalité<strong>{g.player.hp}<small> / {g.player.maxHp}</small></strong></span><i style={{width:g.player.hp/g.player.maxHp*100+'%'}}/></div><div><Sparkles size={16}/><span>Concentration<strong>{g.focus}<small> / {g.perks.focus}</small></strong></span></div><div><KeyRound size={16}/><span>Sceaux<strong>{g.passed}<small> / {g.difficulty.rooms}</small></strong></span></div><div><Gem size={16}/><span>Fragments<strong>{g.score}</strong></span></div></div>}
  <main ref={content} className="door-content">
   {!loaded?<section className="door-moment"><span className="door-eyebrow">LA PORTE INTERDITE</span><h2>{error?'Le passage attend.':'Préparation de l’aventure…'}</h2><p>{error||'Kaïs et les gardiens prennent place.'}</p>{error&&<button className="door-primary" onClick={retry}>Réessayer</button>}</section>:
   !started?<DoorCampaign game={g} profile={account.profile} onSelect={select} onStart={begin} onBenefits={onBenefits}/>:
   paused&&g.status!=='ended'?<section className="door-moment"><Pause size={40}/><span className="door-eyebrow">LE TEMPS EST SUSPENDU</span><h2>Une pause au seuil.</h2><p>Reprends exactement où tu t’es arrêté.</p><button className="door-primary" onClick={pause}><Play size={18}/>Reprendre</button><button className="door-secondary" onClick={levels}><Map size={17}/>Les 100 niveaux</button><button className="door-link" onClick={onClose}>Retour aux jeux</button></section>:
   g.status==='ended'?<DoorResult game={g} onNext={()=>replace(g.stageNumber+1)} onReplay={()=>replace(g.stageNumber,true)} onLevels={levels}/>:
   g.room==='doors'?<DoorChoices game={g} invoke={invoke}/>:
   g.room==='combat'?<DoorCombat game={g} invoke={invoke} canvasRef={canvas}/>:
   g.room==='runes'?<DoorRunes game={g} invoke={invoke}/>:
   g.room==='mechanism'?<DoorMechanism game={g} invoke={invoke} needleRef={needle}/>:
   g.room==='resolved'?<DoorBoon game={g} invoke={invoke}/>:<DoorGate game={g} invoke={invoke}/>}
  </main>
  {started&&<div className="door-journal"><p role="status">{notice||g.message}</p>{g.status==='playing'&&<button disabled={!inPlay||!g.canAct||g.elixirs===0||g.player.hp>=g.player.maxHp} onClick={()=>invoke('heal')} aria-label={`Boire un élixir · ${g.elixirs} restant${g.elixirs>1?'s':''}`}><FlaskConical size={18}/><span>Élixir <b>×{g.elixirs}</b><small>+35 vitalité</small></span></button>}</div>}
  <footer className="door-footer"><span role="status">{rewards}</span><span>{saveMessage}</span></footer>
 </div>;
}
