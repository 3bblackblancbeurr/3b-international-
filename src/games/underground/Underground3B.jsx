import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Car,ChevronRight,LockKeyhole,Play,Shield,Star,Trophy,Wrench,X,Zap} from 'lucide-react';
import {COUNTRIES,COUNTRY_BY_ID,DISCIPLINES,isCountryUnlocked,opponentsFor} from './data.js';
import {activeVehicle,addVehicleSticker,addVehicleVinyl,applyVehicleLook,availableEvents,bossUnlocked,buyUpgrade,buyVisualPart,completeBossStage,completeEvent,createCareerState,progressPercent,registerRivalDefeat,removeVehicleSticker,removeVehicleVinyl,saveVehicleLook,setActiveCountry,setSetting,setTune,setVehicleNeon,setVehiclePlate,setVehicleStance,setVisualColor,territorySummary,validateCareerState} from './career.js';
import {effectiveSpec,estimateTopSpeedKph,estimateZeroToHundred,performanceIndex,UPGRADE_KEYS,upgradeCost,vehicleClass} from './carModel.js';
import {CUSTOMIZATION_CATEGORIES,CUSTOMIZATION_SLOTS,customizationStats} from './customization.js';
import {createRaceSession,raceHud,raceResult,stepRace} from './raceEngine.js';
import {ThreeRaceView} from './ThreeRaceView.js';
import VehicleLabPreview from './VehicleLabPreview.jsx';
import {createFranceVerticalSlicePursuit,franceVerticalSliceEvent,FRANCE_VERTICAL_SLICE_VEHICLE_ID} from './FranceVerticalSliceV1.js';
import './underground.css';

const STORAGE='3b_underground_career_v1';
const RANK={D:0,C:1,B:2,A:3,S:4,X:5};
const UPGRADE_LABEL={engine:'Moteur',intake:'Admission',ecu:'ECU',fuel:'Carburant',exhaust:'Échappement',turbo:'Turbo',intercooler:'Intercooler',cooling:'Refroidissement',clutch:'Embrayage',transmission:'Transmission',differential:'Différentiel',tires:'Pneus',brakes:'Freins',suspension:'Suspension',aero:'Aéro',weight:'Allègement',nitrous:'Nitro',electronics:'Électronique'};
const TUNE_LABEL={finalDrive:'Rapport final',brakeBias:'Balance freinage',suspension:'Suspension',differential:'Différentiel',aeroBalance:'Équilibre aéro',tirePressure:'Pression pneus',camberFront:'Carrossage AV',camberRear:'Carrossage AR',toeFront:'Pincement AV',toeRear:'Pincement AR',rideHeight:'Hauteur de caisse',springRate:'Ressorts',damperBump:'Compression',damperRebound:'Détente',antiRollFront:'Barre antiroulis AV',antiRollRear:'Barre antiroulis AR',steeringRatio:'Rapport direction',diffAccel:'Diff accélération',diffDecel:'Diff décélération',tractionControl:'Antipatinage',absLevel:'ABS',launchControlRpm:'Launch control',turboBoost:'Boost turbo'};
const BOSS_DISCIPLINES={france:['chrono','circuit','duel','nexus'],algeria:['convoy','circuit','duel','nexus'],spain:['flow','rush','duel','nexus'],morocco:['chrono','circuit','duel','nexus'],italy:['endurance','rush','duel','nexus'],tunisia:['redline','rush','duel','nexus'],turkey:['chrono','rush','duel','nexus'],estonia:['circuit','rush','duel','nexus']};

function load(){try{return validateCareerState(JSON.parse(localStorage.getItem(STORAGE)||'null'));}catch{return createCareerState();}}
function allowed(event,vehicle){const r=RANK[vehicleClass(vehicle)];return r>=RANK[event.classMin]&&r<=RANK[event.classMax];}
function fmt(v=0){const m=Math.floor(v/60),s=(v-m*60).toFixed(1).padStart(4,'0');return `${m}:${s}`;}
function rivalEvent(country,rival,index){return {id:`${country.id}-rival-${index}`,countryId:country.id,discipline:'duel',routeId:country.routes[(index+2)%country.routes.length].id,name:`Duel · ${rival.name}`,distanceKm:4.2+index*.25,weather:country.weather[index%country.weather.length],traffic:'medium',mastery:{targetFactor:.97},reward:{influence:0,xp:0,coins:0}};}
function bossEvent(country,stage){return {id:`${country.id}-boss-${stage}`,countryId:country.id,discipline:BOSS_DISCIPLINES[country.id][stage],routeId:country.routes[Math.min(country.routes.length-1,stage+4)].id,name:`${country.guardian} · ${country.stages[stage]}`,distanceKm:5.2+stage*1.45,weather:country.weather[stage%country.weather.length],traffic:stage===2?'low':'medium',mastery:{targetFactor:.955},reward:{influence:0,xp:0,coins:0}};}
function bossQualified(id,r){if(r.position!==1)return false;return ({france:r.collisions<=2,algeria:r.collisions<=4,spain:r.driftScore>=450,morocco:r.collisions<=1,italy:r.time<=r.targetTime*1.18,tunisia:r.bestSpeedKph>=175,turkey:r.offroadSeconds<=4,estonia:r.collisions<=3}[id]??true);}

function useLandscapeOnly(){
  const initial=()=>typeof window!=='undefined'?window.matchMedia('(orientation: portrait)').matches:false;
  const[portrait,setPortrait]=useState(initial);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const mq=window.matchMedia('(orientation: portrait)');
    const sync=()=>setPortrait(mq.matches);
    sync();
    mq.addEventListener?.('change',sync);
    window.addEventListener('orientationchange',sync);
    globalThis.screen?.orientation?.lock?.('landscape').catch?.(()=>{});
    document.documentElement.classList.add('u3b-landscape-session');
    return()=>{mq.removeEventListener?.('change',sync);window.removeEventListener('orientationchange',sync);document.documentElement.classList.remove('u3b-landscape-session');};
  },[]);
  return portrait;
}

function LandscapeGate(){
  return <div className="u3b-landscape-gate" role="status" aria-live="polite"><div className="u3b-phone-rotate"><i/><i/></div><span>3B UNDERGROUND</span><h2>Tourne ton appareil</h2><p>Le jeu est désormais conçu exclusivement en mode horizontal pour la conduite, le garage et les menus.</p></div>;
}

export default function Underground3B({onClose}){
  const[career,setCareer]=useState(load),[screen,setScreen]=useState('nexus'),[countryId,setCountryId]=useState(()=>load().activeCountryId),[race,setRace]=useState(null),[result,setResult]=useState(null),[notice,setNotice]=useState('');
  const portrait=useLandscapeOnly();
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(career));}catch{}},[career]);
  const country=COUNTRY_BY_ID[countryId]||COUNTRIES[0],vehicle=activeVehicle(career),summary=territorySummary(career,country.id),events=availableEvents(career,country.id);
  const goCountry=id=>{if(!isCountryUnlocked(id,career))return;setCareer(setActiveCountry(career,id));setCountryId(id);setScreen('territory');setResult(null);};
  const startEvent=e=>{const chosen=e.id==='france-e01'?franceVerticalSliceEvent():e;if(!allowed(chosen,vehicle)){setNotice(`${vehicle.name||'Véhicule'} ${vehicleClass(vehicle)} incompatible : classe ${chosen.classMin}–${chosen.classMax}.`);return;}setNotice('');setRace({kind:'event',event:chosen,pursuit:chosen.verticalSlice?createFranceVerticalSlicePursuit():null});};
  const startRival=(r,i)=>setRace({kind:'rival',countryId:country.id,rival:r,event:rivalEvent(country,r,i)});
  const startBoss=()=>{const stage=career.territories[country.id].bossStages;setRace({kind:'boss',countryId:country.id,stage,event:bossEvent(country,stage)});};
  const finish=r=>{
    let next=career,reward=null,message='',qualified=r.position===1;
    if(race.kind==='event'){const a=completeEvent(career,race.event.id,r);next=a.state;reward=a.reward;message=a.error||'';}
    else if(race.kind==='rival'){if(qualified)next=registerRivalDefeat(career,race.countryId,race.rival.id,race.rival.role);message=qualified?'Rival battu.':'Le rival reste devant.';}
    else{qualified=bossQualified(race.countryId,r);const a=completeBossStage(career,race.countryId,race.stage,qualified);next=a.state;message=a.error||(qualified?'Étape du Gardien validée.':'Règle du Gardien non respectée.');}
    setCareer(next);setResult({race:{...race},data:r,reward,qualified,message});setRace(null);
  };
  const close=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(career));}catch{}onClose?.();};
  if(race)return <><RaceScene config={race} vehicle={vehicle} settings={career.settings} onFinish={finish} onAbort={()=>setRace(null)}/>{portrait&&<LandscapeGate/>}</>;
  return <div className="u3b-shell" role="dialog" aria-modal="true" aria-label="3B Underground">
    <header className="u3b-top"><button onClick={screen==='nexus'?close:()=>setScreen('nexus')}><ArrowLeft/></button><div><b>3B UNDERGROUND</b><small>LE CERCLE BRISÉ</small></div><nav><span>Niv. {career.level}</span><span>{career.coins.toLocaleString('fr-FR')} 3B</span><span>{career.fragments.length}/8 fragments</span></nav><button onClick={close}><X/></button></header>
    <nav className="u3b-main-menu" aria-label="Menu 3B Underground">
      <button className={screen==='territory'?'active':''} onClick={()=>setScreen('territory')}>JOUER</button>
      <button className={screen==='garage'?'active':''} onClick={()=>setScreen('garage')}>GARAGE</button>
      <button className={screen==='nexus'?'active':''} onClick={()=>setScreen('nexus')}>CARTE</button>
      <button className={screen==='territory'?'active':''} onClick={()=>setScreen('territory')}>CARRIÈRE</button>
      <button onClick={()=>setScreen('territory')}>COURSES</button>
      <button onClick={()=>setScreen('garage')}>VÉHICULE</button>
      <button onClick={()=>setScreen('garage')}>CUSTOMISATION</button>
      <button onClick={()=>{goCountry('france');setNotice('POLICE V1 · Lance France Gold Slice · Quais de Justice.');}}>POLICE</button>
      <button onClick={()=>setScreen('nexus')}>PROGRESSION</button>
      <button className={screen==='settings'?'active':''} onClick={()=>setScreen('settings')}>PARAMÈTRES</button>
    </nav>
    {notice&&<div className="u3b-notice">{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
    {screen==='nexus'&&<Nexus career={career} onCountry={goCountry} onGarage={()=>setScreen('garage')}/>} 
    {screen==='territory'&&<Territory country={country} career={career} summary={summary} events={events} vehicle={vehicle} onEvent={startEvent} onRival={startRival} onBoss={startBoss} onGarage={()=>setScreen('garage')}/>} 
    {screen==='garage'&&<Garage career={career} vehicle={vehicle} onChange={setCareer} onBack={()=>setScreen('territory')}/>} 
    {screen==='settings'&&<Settings career={career} onChange={setCareer}/>} 
    {result&&<Result result={result} onClose={()=>setResult(null)} onRetry={()=>{setRace(result.race);setResult(null);}}/>}
    {portrait&&<LandscapeGate/>}
  </div>;
}

function Nexus({career,onCountry,onGarage}){
  const pct=progressPercent(career),v=activeVehicle(career);
  return <main className="u3b-page"><section className="u3b-hero"><div><span>PASSEPORT 3B / NEXUS AUTO</span><h1>8 pays. 8 Gardiens.<br/>1 Cercle à reconstruire.</h1><p>La campagne, la physique, l’IA, le tuning et la personnalisation sont indépendants des futurs modèles de voitures.</p><button onClick={onGarage}><Wrench/> Atelier & garage</button></div><div className="u3b-ring"><b>{pct}%</b><small>HÉRITAGE</small></div></section><div className="u3b-vehicle-line"><Car/>Prototype {vehicleClass(v)} · PI {performanceIndex(v)} · {estimateTopSpeedKph(v)} km/h</div><section className="u3b-countries">{COUNTRIES.map(c=>{const unlocked=isCountryUnlocked(c.id,career),s=territorySummary(career,c.id),done=career.fragments.includes(c.id);return <button key={c.id} className={`${unlocked?'':'locked'} ${done?'done':''}`} style={{'--accent':c.accent}} onClick={()=>unlocked&&onCountry(c.id)}><b>{c.code}</b>{!unlocked&&<LockKeyhole/>}<strong>{c.name}</strong><span>{c.guardian} · {c.value}</span><i><em style={{width:`${s.influence/100}%`}}/></i><small>{done?'FRAGMENT OBTENU':unlocked?`${s.influence.toLocaleString('fr-FR')} / 10 000 influence`:`${c.unlock.fragments} fragment(s) requis`}</small></button>;})}</section></main>;
}

function Territory({country,career,summary,events,vehicle,onEvent,onRival,onBoss,onGarage}){
  const rivals=opponentsFor(country.id),t=career.territories[country.id],ready=bossUnlocked(career,country.id)||t.bossStages>0;
  return <main className="u3b-page" style={{'--accent':country.accent}}><section className="u3b-region"><div><span>{country.code} · PALIER {summary.tier}</span><h1>{country.name} — {country.value}</h1><p>{country.identity}</p></div><aside><Shield/><b>{country.guardian}</b><small>{country.bossRule}</small></aside></section><div className="u3b-tabs"><button onClick={onGarage}><Wrench/>Atelier</button><span>PI {performanceIndex(vehicle)} · {vehicleClass(vehicle)}</span><span><Trophy/> {summary.won}/24</span><span><Star/> {summary.mastered} maîtrisées</span></div><h2>Épreuves disponibles</h2><section className="u3b-events">{events.map(e=>{const rec=t.events[e.id];return <button key={e.id} className={allowed(e,vehicle)?'':'mismatch'} onClick={()=>onEvent(e)}><span>{DISCIPLINES[e.discipline].name} · Palier {e.tier}</span><strong>{e.name}</strong><small>{e.distanceKm} km · {e.weather} · {e.classMin}–{e.classMax}</small><footer>{rec?.wins?`✓ ${rec.bestStars}★`:'NOUVEAU'}<ChevronRight/></footer></button>;})}</section><h2>Rivaux</h2><section className="u3b-rivals">{rivals.filter(r=>r.role!=='guardian').map((r,i)=>{const defeated=t.rivals.includes(r.id),locked=r.role==='lieutenant'&&summary.influence<8000;return <button key={r.id} disabled={defeated||locked} onClick={()=>onRival(r,i)}><span>{r.role}</span><b>{r.name}</b><small>{defeated?'VAINCU':locked?'8 000 influence requis':`${r.type} · ${Math.round(r.skill*100)}%`}</small></button>;})}</section><section className="u3b-boss"><Shield/><div><span>RITE DU GARDIEN</span><h2>{country.guardian}</h2><p>{ready?`Étape ${Math.min(4,t.bossStages+1)}/4 · ${country.stages[Math.min(3,t.bossStages)]}`:'10 000 influence · 3 majeures · 3 maîtrises ★★★ · lieutenant vaincu'}</p></div><button disabled={!ready||t.guardianDefeated} onClick={onBoss}>{t.guardianDefeated?'FRAGMENT OBTENU':ready?<><Play/>Lancer</>:'Verrouillé'}</button></section></main>;
}

function Garage({career,vehicle,onChange,onBack}){
  const spec=effectiveSpec(vehicle),pi=performanceIndex(vehicle),[tab,setTab]=useState('performance'),[visualCategory,setVisualCategory]=useState('body'),[message,setMessage]=useState('');
  const c=vehicle.customization,stats=customizationStats(c);
  const buyVisual=id=>{const r=buyVisualPart(career,id);setMessage(r.error||`Pièce équipée${r.cost?` · ${r.cost.toLocaleString('fr-FR')} 3B`:''}.`);if(!r.error)onChange(r.state);};
  const categorySlots=CUSTOMIZATION_SLOTS.filter(s=>s.category===visualCategory);
  return <main className="u3b-page">
    <button className="u3b-back" onClick={onBack}><ArrowLeft/>Retour</button>
    <section className="u3b-garage-head"><div><span>{vehicle.productionRef===FRANCE_VERTICAL_SLICE_VEHICLE_ID?'PARISIENNE MONTARA · GOLD MASTER CANDIDATE':'ATELIER ULTRA · PRODUCTION EN COURS'}</span><h1>3B Custom Lab</h1><p>Performance, carrosserie, habitacle, audio, lumières, peinture, stance et livrées sont sauvegardés. La Montara candidate PBR est maintenant branchée au garage et au moteur de course.</p></div><div><b>{pi}</b><small>PI · {vehicleClass(vehicle)}</small></div></section>
    <VehicleLabPreview vehicle={vehicle}/>
    <section className="u3b-specs"><div><small>Puissance</small><b>{Math.round(spec.powerKwEff*1.341)} ch</b></div><div><small>0–100</small><b>{estimateZeroToHundred(vehicle)} s</b></div><div><small>Vitesse</small><b>{estimateTopSpeedKph(vehicle)} km/h</b></div><div><small>Personnalisation</small><b>{stats.options}+ options</b></div></section>
    <div className="u3b-garage-tabs"><button className={tab==='performance'?'active':''} onClick={()=>setTab('performance')}>Performance</button><button className={tab==='visual'?'active':''} onClick={()=>{setTab('visual');setVisualCategory('body');}}>Style extérieur</button><button className={tab==='interior'?'active':''} onClick={()=>{setTab('interior');setVisualCategory('interior');}}>Habitacle & audio</button><button className={tab==='livery'?'active':''} onClick={()=>setTab('livery')}>Peinture & livrées</button></div>
    {message&&<p className="u3b-custom-message">{message}</p>}
    {tab==='performance'&&<><h2>18 familles performance</h2><section className="u3b-upgrades">{UPGRADE_KEYS.map(k=>{const lvl=vehicle.upgrades[k]||0,cost=upgradeCost(vehicle,k);return <button key={k} disabled={lvl>=5||career.coins<(cost||0)} onClick={()=>{const r=buyUpgrade(career,k);setMessage(r.error||`${UPGRADE_LABEL[k]} niveau ${lvl+1}.`);if(!r.error)onChange(r.state);}}><span>{UPGRADE_LABEL[k]}</span><b>Niveau {lvl}/5</b><small>{lvl>=5?'MAX':`${cost.toLocaleString('fr-FR')} 3B`}</small></button>;})}</section><h2>Réglage PRO</h2><section className="u3b-tune">{Object.entries(vehicle.tune).map(([k,v])=><label key={k}><span>{TUNE_LABEL[k]||k}</span><input type="range" min="0" max="1" step="0.01" value={v} onChange={e=>onChange(setTune(career,k,e.target.value))}/><b>{Math.round(v*100)}%</b></label>)}</section></>}
    {tab==='visual'&&<><div className="u3b-custom-categories">{CUSTOMIZATION_CATEGORIES.filter(x=>['body','wheels','lighting','engineBay','identity'].includes(x.id)).map(x=><button key={x.id} className={visualCategory===x.id?'active':''} onClick={()=>setVisualCategory(x.id)}>{x.label}</button>)}</div><section className="u3b-custom-slots">{categorySlots.map(slot=><article key={slot.id}><h3>{slot.label}</h3><div>{slot.options.map(o=>{const owned=c.ownedParts.includes(o.id),equipped=c.selections[slot.id]===o.id;return <button key={o.id} className={equipped?'equipped':''} disabled={!owned&&career.coins<o.price} onClick={()=>buyVisual(o.id)}><b>{o.label}</b><small>{equipped?'ÉQUIPÉ':owned?'POSSEDÉ':o.price?`${o.price.toLocaleString('fr-FR')} 3B`:'GRATUIT'}</small></button>;})}</div></article>)}</section><h2>Stance</h2><section className="u3b-tune">{Object.entries(c.stance).map(([k,v])=><label key={k}><span>{k}</span><input type="range" min="0" max="1" step="0.01" value={v} onChange={e=>onChange(setVehicleStance(career,k,e.target.value))}/><b>{Math.round(v*100)}%</b></label>)}</section><h2>Néons</h2><section className="u3b-custom-controls"><label><span>Activés</span><input type="checkbox" checked={c.neon.enabled} onChange={e=>onChange(setVehicleNeon(career,'enabled',e.target.checked))}/></label><label><span>Couleur</span><input type="color" value={c.neon.color} onChange={e=>onChange(setVehicleNeon(career,'color',e.target.value))}/></label><label><span>Intensité</span><input type="range" min="0" max="1" step="0.01" value={c.neon.intensity} onChange={e=>onChange(setVehicleNeon(career,'intensity',e.target.value))}/></label></section></>}
    {tab==='interior'&&<><div className="u3b-custom-categories">{CUSTOMIZATION_CATEGORIES.filter(x=>['interior','audio'].includes(x.id)).map(x=><button key={x.id} className={visualCategory===x.id?'active':''} onClick={()=>setVisualCategory(x.id)}>{x.label}</button>)}</div><section className="u3b-custom-slots">{CUSTOMIZATION_SLOTS.filter(s=>s.category===visualCategory&&['interior','audio'].includes(s.category)).map(slot=><article key={slot.id}><h3>{slot.label}</h3><div>{slot.options.map(o=>{const owned=c.ownedParts.includes(o.id),equipped=c.selections[slot.id]===o.id;return <button key={o.id} className={equipped?'equipped':''} disabled={!owned&&career.coins<o.price} onClick={()=>buyVisual(o.id)}><b>{o.label}</b><small>{equipped?'ÉQUIPÉ':owned?'POSSEDÉ':o.price?`${o.price.toLocaleString('fr-FR')} 3B`:'GRATUIT'}</small></button>;})}</div></article>)}</section><h2>Couleurs habitacle</h2><section className="u3b-custom-controls">{['interior','stitch','accent'].map(k=><label key={k}><span>{k}</span><input type="color" value={c.colors[k]} onChange={e=>onChange(setVisualColor(career,k,e.target.value))}/></label>)}</section></>}
    {tab==='livery'&&<><h2>Peinture</h2><section className="u3b-custom-controls">{['primary','secondary','accent','caliper','light'].map(k=><label key={k}><span>{k}</span><input type="color" value={c.colors[k]} onChange={e=>onChange(setVisualColor(career,k,e.target.value))}/></label>)}</section><section className="u3b-custom-slots">{CUSTOMIZATION_SLOTS.filter(s=>s.category==='paint').map(slot=><article key={slot.id}><h3>{slot.label}</h3><div>{slot.options.map(o=><button key={o.id} className={c.selections[slot.id]===o.id?'equipped':''} onClick={()=>buyVisual(o.id)}><b>{o.label}</b><small>{c.selections[slot.id]===o.id?'ÉQUIPÉ':c.ownedParts.includes(o.id)?'POSSEDÉ':`${o.price.toLocaleString('fr-FR')} 3B`}</small></button>)}</div></article>)}</section><h2>Éditeur de livrée</h2><div className="u3b-livery-actions"><button onClick={()=>onChange(addVehicleVinyl(career,{kind:'shape',shape:'stripe',color:'#d7b76b',surface:'left'}))}>+ Bande or</button><button onClick={()=>onChange(addVehicleVinyl(career,{kind:'text',text:'3B',color:'#ffffff',surface:'hood'}))}>+ Texte 3B</button><button onClick={()=>onChange(addVehicleSticker(career,{design:'3B International',surface:'rear'}))}>+ Sticker 3B</button><button onClick={()=>onChange(saveVehicleLook(career,`Look ${c.savedLooks.length+1}`))}>Sauver le look</button></div><section className="u3b-layer-list">{c.vinylLayers.map(v=><button key={v.id} onClick={()=>onChange(removeVehicleVinyl(career,v.id))}>{v.kind} · {v.text||v.shape} · {v.surface} <small>supprimer</small></button>)}{c.stickers.map(v=><button key={v.id} onClick={()=>onChange(removeVehicleSticker(career,v.id))}>Sticker · {v.design} <small>supprimer</small></button>)}</section>{c.savedLooks.length>0&&<><h2>Looks sauvegardés</h2><div className="u3b-livery-actions">{c.savedLooks.map((look,i)=><button key={i} onClick={()=>onChange(applyVehicleLook(career,i))}>{look.name}</button>)}</div></>}<h2>Plaque</h2><section className="u3b-custom-controls"><label><span>Texte</span><input value={c.plate.text} maxLength={12} onChange={e=>onChange(setVehiclePlate(career,{text:e.target.value}))}/></label><label><span>Style</span><select value={c.plate.style} onChange={e=>onChange(setVehiclePlate(career,{style:e.target.value}))}><option value="black">Noire</option><option value="white">Blanche</option><option value="gold">Or</option><option value="matrix">Matrix</option></select></label></section></>}
  </main>;
}

function Settings({career,onChange}){
  const s=career.settings;
  const change=(key,value)=>onChange(setSetting(career,key,value));
  return <main className="u3b-page"><section className="u3b-settings-head"><span>3B UNDERGROUND · PILOTAGE</span><h1>Paramètres Gold Master</h1><p>Ajuste les sensations sans casser la physique : direction, caméra, vibrations et cible FPS.</p></section><section className="u3b-settings-grid">
    <label><span>Difficulté</span><select value={s.difficulty} onChange={e=>change('difficulty',e.target.value)}><option value="easy">Facile</option><option value="normal">Normal</option><option value="hard">Difficile</option><option value="legend">Légende</option></select></label>
    <label><span>Sensibilité direction</span><input type="range" min=".6" max="1.4" step=".05" value={s.steeringSensitivity} onChange={e=>change('steeringSensitivity',Number(e.target.value))}/><b>{Math.round(s.steeringSensitivity*100)}%</b></label>
    <label><span>Caméra</span><select value={s.camera} onChange={e=>change('camera',e.target.value)}><option value="close">Proche</option><option value="medium">Moyenne</option><option value="far">Éloignée</option></select></label>
    <label><span>Vibrations caméra</span><input type="range" min="0" max="1" step=".05" value={s.cameraShake} onChange={e=>change('cameraShake',Number(e.target.value))}/><b>{Math.round(s.cameraShake*100)}%</b></label>
    <label><span>Qualité graphique</span><select value={String(s.graphicsQuality||'auto')} onChange={e=>change('graphicsQuality',e.target.value)}><option value="auto">Auto</option><option value="low">Faible</option><option value="medium">Moyen</option><option value="high">Élevé</option><option value="ultra">Ultra</option></select></label>
    <label><span>FPS</span><select value={String(s.fpsTarget)} onChange={e=>change('fpsTarget',e.target.value)}><option value="auto">Auto</option><option value="60">60 FPS</option><option value="30">30 FPS stable</option></select></label>
    <label><span>Taille commandes</span><input type="range" min=".8" max="1.25" step=".05" value={s.controlScale||1} onChange={e=>change('controlScale',Number(e.target.value))}/><b>{Math.round((s.controlScale||1)*100)}%</b></label>
    <label className="u3b-toggle"><span>Retour haptique</span><input type="checkbox" checked={s.haptics!==false} onChange={e=>change('haptics',e.target.checked)}/></label>
  </section></main>;
}

function RaceScene({config,vehicle,settings,onFinish,onAbort}){
  const canvas=useRef(null),session=useRef(null),rendererRef=useRef(null),input=useRef({throttle:0,brake:0,steer:0,nitrous:false}),steerPad=useRef(null),steerPointer=useRef(null),pausedRef=useRef(false),finished=useRef(false),[hud,setHud]=useState(null),[paused,setPaused]=useState(false),[error,setError]=useState(''),[touchSteer,setTouchSteer]=useState(0),[cameraMode,setCameraMode]=useState(settings?.camera||'medium');
  useEffect(()=>{
    const difficulty=settings?.difficulty||'normal';const s=createRaceSession({event:config.event,vehicle,difficulty,boss:config.kind==='boss',bossStage:config.stage||0});session.current=s;let renderer;
    try{renderer=new ThreeRaceView(canvas.current,config.event,vehicle,{cameraMode:settings?.camera||'medium',cameraShake:settings?.cameraShake??.18,fpsTarget:settings?.fpsTarget||'auto',graphicsQuality:settings?.graphicsQuality||'auto'});rendererRef.current=renderer;}catch(e){setError(e.message||'WebGL indisponible.');return;}
    let raf,last=performance.now(),tick=0;const resize=()=>renderer.resize();window.addEventListener('resize',resize);
    const down=e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','z','q','shift','c'].includes(k))e.preventDefault();if(k==='escape'||k==='p'){pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);return;}if(k==='c'){const mode=rendererRef.current?.cycleCameraMode?.();if(mode)setCameraMode(mode);return;}if(k==='arrowup'||k==='w'||k==='z')input.current.throttle=1;if(k==='arrowdown'||k==='s')input.current.brake=1;if(k==='arrowleft'||k==='a'||k==='q')input.current.steer=-1;if(k==='arrowright'||k==='d')input.current.steer=1;if(k===' '||k==='shift')input.current.nitrous=true;};
    const up=e=>{const k=e.key.toLowerCase();if(k==='arrowup'||k==='w'||k==='z')input.current.throttle=0;if(k==='arrowdown'||k==='s')input.current.brake=0;if((k==='arrowleft'||k==='a'||k==='q')&&input.current.steer<0)input.current.steer=0;if((k==='arrowright'||k==='d')&&input.current.steer>0)input.current.steer=0;if(k===' '||k==='shift')input.current.nitrous=false;};
    window.addEventListener('keydown',down,{passive:false});window.addEventListener('keyup',up);
    const targetFrameMs=String(settings?.fpsTarget)==='30'?1000/30:0;const loop=now=>{if(targetFrameMs&&now-last<targetFrameMs){raf=requestAnimationFrame(loop);return;}const dt=Math.min(.05,(now-last)/1000);last=now;if(!pausedRef.current)stepRace(s,input.current,dt);if(s.feedback){if(settings?.haptics!==false)globalThis.navigator?.vibrate?.(s.feedback==='collision'?28:14);s.feedback=null;}renderer.render(s,dt);tick+=dt;if(tick>.08){tick=0;setHud(raceHud(s));}if(s.status==='finished'&&!finished.current){finished.current=true;setTimeout(()=>onFinish(raceResult(s)),350);return;}raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);rendererRef.current=null;renderer.dispose();};
  },[]);
  const touch=patch=>({onPointerDown:e=>{e.currentTarget.setPointerCapture?.(e.pointerId);Object.assign(input.current,patch);},onPointerUp:()=>Object.keys(patch).forEach(k=>input.current[k]=k==='nitrous'?false:0),onPointerCancel:()=>Object.keys(patch).forEach(k=>input.current[k]=k==='nitrous'?false:0)});
  const updateSteer=e=>{const el=steerPad.current;if(!el)return;const rect=el.getBoundingClientRect(),center=rect.left+rect.width/2,range=Math.max(1,rect.width*.42),sensitivity=settings?.steeringSensitivity??1,value=Math.max(-1,Math.min(1,((e.clientX-center)/range)*sensitivity));input.current.steer=value;setTouchSteer(value);};
  const steerHandlers={
    onPointerDown:e=>{steerPointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);updateSteer(e);},
    onPointerMove:e=>{if(steerPointer.current===e.pointerId)updateSteer(e);},
    onPointerUp:e=>{if(steerPointer.current!==e.pointerId)return;steerPointer.current=null;input.current.steer=0;setTouchSteer(0);},
    onPointerCancel:e=>{if(steerPointer.current!==e.pointerId)return;steerPointer.current=null;input.current.steer=0;setTouchSteer(0);}
  };
  const cycleCamera=()=>{const mode=rendererRef.current?.cycleCameraMode?.();if(mode)setCameraMode(mode);};
  return <div className="u3b-race" style={{'--control-scale':settings?.controlScale||1}}><canvas ref={canvas}/><header><button onClick={onAbort}><X/></button><div><small>{DISCIPLINES[config.event.discipline].name}</small><b>{config.event.name}</b></div><button onClick={()=>{pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);}}>{paused?'▶':'Ⅱ'}</button></header>{config.pursuit&&<div className="u3b-police-heat">POLICE · HEAT {config.pursuit.state.heat} · {config.pursuit.budget.maxUnits} unités</div>}{hud&&<><div className="u3b-rank">{hud.position}<small>/{hud.total}</small></div><div className="u3b-racebar"><i style={{width:`${hud.progress*100}%`}}/></div><div className="u3b-speed"><b>{hud.speedKph}</b><span>KM/H</span><small>V{hud.gear} · NITRO {Math.round(hud.nitrous*100)}%</small></div></>}<div className="u3b-touch"><div className="u3b-steering"><span>DIRECTION</span><div ref={steerPad} className="u3b-steer-pad" style={{'--steer':touchSteer}} {...steerHandlers}><i className="u3b-steer-center"/><i className="u3b-steer-thumb"/></div></div><div className="u3b-pedals"><button className="brake" aria-label="Frein" {...touch({brake:1})}>FREIN</button><button className="cam" aria-label="Changer caméra" onPointerDown={e=>{e.preventDefault();cycleCamera();}}>CAM<br/><small>{cameraMode.toUpperCase()}</small></button><button className="nitro" aria-label="Nitro" {...touch({nitrous:true})}><Zap/>NITRO</button><button className="gas" aria-label="Accélérateur" {...touch({throttle:1})}><small>ACCÉL.</small>GAZ</button></div></div>{session.current?.status==='countdown'&&<div className="u3b-count">{Math.max(1,Math.ceil(session.current.countdown))}</div>}{paused&&<div className="u3b-overlay"><h2>PAUSE</h2><button onClick={()=>{pausedRef.current=false;setPaused(false);}}>Reprendre</button><button onClick={onAbort}>Quitter</button></div>}{error&&<div className="u3b-overlay"><h2>Rendu 3D indisponible</h2><p>{error}</p><button onClick={onAbort}>Retour</button></div>}</div>;
}

function Result({result,onClose,onRetry}){
  const r=result.data,won=result.qualified??r.position===1;
  return <div className="u3b-result-bg"><section><span>{won?'ÉPREUVE VALIDÉE':'À REPRENDRE'}</span><h2>{result.race.event.name}</h2><div className="u3b-place">#{r.position}<small>{fmt(r.time)}</small></div><p>Vitesse max {r.bestSpeedKph} km/h · collisions {r.collisions} · hors-piste {r.offroadSeconds.toFixed(1)} s · Flow {r.driftScore}</p>{result.reward&&<b>+{result.reward.influence} influence · +{result.reward.xp} XP · +{result.reward.coins} 3B · {result.reward.stars}★</b>}{result.message&&<p>{result.message}</p>}<footer><button onClick={onRetry}>Rejouer</button><button className="primary" onClick={onClose}>Continuer</button></footer></section></div>;
}
