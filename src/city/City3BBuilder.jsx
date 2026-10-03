import {Button} from '../design-system/index.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Building2,House,Store,Trees,HeartPulse,TrainFront,Landmark,Coins,Users,Heart,Flag,Route,Settings2,X,Maximize2,Move,PackageOpen,RotateCw,Undo2,Redo2,Search,Check,HardHat,Gift,Waves,Eraser} from 'lucide-react';
import City3DMap from './City3DMap.jsx';
import CityBuildingPreview from './CityBuildingPreview.jsx';
import {cityFootprint,cityPlacementCheck,citySuggestedParcel,cityCatalogue,CITY_BUILD_CATEGORIES,cityLevelProgress,cityBuildingLimit} from './city3b-construction.js';
import {cityBuildingKind,cityMapCustomRoads,cityMapInitialView} from './city3b-map.js';
import {cityConstructionState,cityConstructionDuration,cityBuildingBenefit} from './city3b-building-progress.js';
import {campaignSummary} from './city3b-campaign.js';
import useCityClock from './useCityClock.js';
import {cityLandscape,sameCityPlan,roadDraft,landscapeDraft,landscapeCheck,LANDSCAPE_TOOLS,LANDSCAPE_WIDTHS} from './city3b-landscape.js';
import {cityNetworks,cityNetworkCheck,CITY_NETWORK_TOOLS} from './city3b-networks.js';
import {cityEraseTargets,cityErasePlan} from './city3b-erase.js';
import {CITY_ROAD_TYPES,cityRoadType} from './city3b-road-types.js';
import {citySignals,citySignalTarget} from './city3b-signals.js';
import './city3b-game.css';

const EMPTY_PREMIUM_CODES=new Set();
const requestId=()=>crypto.randomUUID();
const normalizeRotation=value=>((Math.round((Number(value)||0)/90)*90)%360+360)%360;
const collisionState=cityPlacementCheck;
const iconFor=row=>({housing:House,commerce:Store,green:Trees,civic:HeartPulse,mobility:TrainFront,landmark:Landmark})[cityBuildingKind(row)]||Building2;

export default function City3BBuilder({data,busy,call,premiumCodes=EMPTY_PREMIUM_CODES,focus,onOpenPanel=()=>{},onClose,onFullscreen,panelOpen=false}){
 const city=data.city||{},now=useCityClock(data.serverTime),definitions=useMemo(()=>new Map((data.buildings||[]).map(row=>[row.code,row])),[data.buildings]);
 const [view,setView]=useState(()=>cityMapInitialView(data));
 const zoom=view.zoom,center=view.center,setZoom=change=>setView(v=>({...v,zoom:typeof change==='function'?change(v.zoom):change})),setCenter=change=>setView(v=>({...v,center:typeof change==='function'?change(v.center):change}));
 const [tool,setTool]=useState('inspect'),[catalog,setCatalog]=useState(false),[selectedCode,setSelectedCode]=useState(''),[selectedId,setSelectedId]=useState(''),[draft,setDraft]=useState({x:0,z:0,rotation:0});
 const [catalogLimit,setCatalogLimit]=useState(36);
 const [category,setCategory]=useState('all'),[query,setQuery]=useState(''),[showStored,setShowStored]=useState(false),[roadStart,setRoadStart]=useState(null),[notice,setNotice]=useState('');
 const [networkKind,setNetworkKind]=useState('road'),[roadType,setRoadType]=useState('simple'),[signalPoint,setSignalPoint]=useState(null),[signalMode,setSignalMode]=useState('balanced'),[signalGreen,setSignalGreen]=useState(12);
 const roadWidth=networkKind==='road'?cityRoadType(roadType).width:4;
 const [drawEnd,setDrawEnd]=useState(null),[roadMode,setRoadMode]=useState('straight'),[landscapeKind,setLandscapeKind]=useState('lake'),[landscapeWidth,setLandscapeWidth]=useState(24),[details,setDetails]=useState(false),[pan,setPan]=useState(false),[drawOptions,setDrawOptions]=useState(false);
 const [eraseTargets,setEraseTargets]=useState([]),[eraseIndex,setEraseIndex]=useState(0);
 const seeds=useRef(new Map()),[,refreshSeeds]=useState(0);
 const modelSeed=code=>{if(!seeds.current.has(code))seeds.current.set(code,requestId());return seeds.current.get(code);};
 const storageKey=`threeb:city-editor:v1:${city.city_id||'unknown'}`;
 const [history,setHistory]=useState([]),[future,setFuture]=useState([]),pendingRequest=useRef(null);
 const selectedPlacement=(data.placements||[]).find(row=>row.id===selectedId)||null;
 const activeDefinition=definitions.get(selectedPlacement?.building_code||selectedCode)||null;
 const placing=tool==='build'||tool==='move',size=placing&&activeDefinition?cityFootprint(activeDefinition,draft.rotation,selectedPlacement):null;
 const validation=size?collisionState(data,draft,size,selectedPlacement?.id):null;
 const limit=cityBuildingLimit(data,activeDefinition,selectedPlacement?.id);
 const affordable=!!selectedPlacement||Number(data.wallet?.coins||0)>=Number(activeDefinition?.cost_coins||0);
 const unlocked=!!selectedPlacement||Number(city.city_level||1)>=Number(activeDefinition?.unlock_level||1);
 const progress=cityConstructionState(selectedPlacement,now),level=cityLevelProgress(city.city_xp),mission=campaignSummary(data.campaign).active;
 const roads=useMemo(()=>cityMapCustomRoads(data),[data.city]);
 const networks=useMemo(()=>cityNetworks(data),[data.city]);
 const networkTool=tool==='road'&&networkKind!=='road';
 const signals=useMemo(()=>citySignals(data),[data.city]);
 const signalTarget=signalPoint?citySignalTarget(data,signalPoint):null;
 const terrain=useMemo(()=>cityLandscape(data),[data.city]);
 const drawingList=tool==='road'?(networkTool?networks:roads):terrain;
 const drawingAction=tool==='road'?(networkTool?'plan_networks':'plan_roads'):'plan_terrain';
 const drawingKind=tool==='road'?(networkTool?'networks':'roads'):'terrain';
 const drawingBody=(to,from)=>drawingAction==='plan_roads'?{roads:to,expectedRoads:from}:{features:to,expected:from};
 const drawPreview=useMemo(()=>roadStart&&drawEnd?(tool==='road'?roadDraft(roadStart,drawEnd,networkTool?networks.filter(n=>n.kind===networkKind):roads,roadWidth,roadMode).map(r=>networkTool?{...r,kind:networkKind}:{...r,roadType}):tool==='landscape'?[landscapeDraft(landscapeKind,roadStart,drawEnd,landscapeWidth)]:[]):[],[roadStart,drawEnd,tool,roads,networks,networkKind,networkTool,roadType,roadWidth,roadMode,landscapeKind,landscapeWidth]);
 const drawCheck=networkTool?cityNetworkCheck(data,drawPreview):landscapeCheck(data,drawPreview,{road:tool==='road'});
 const buildings=useMemo(()=>cityCatalogue(data,{query,category,availableOnly:false}),[data.buildings,city.city_level,query,category]);
 const stored=(data.placements||[]).filter(p=>p.placement_state==='stored');
 const sites=(data.placements||[]).filter(p=>p.placement_state!=='stored'&&cityConstructionState(p,now).progress<1);
 const ready=(data.placements||[]).filter(p=>cityConstructionState(p,now).ready);
 const clearSelection=()=>{setSignalPoint(null);setEraseTargets([]);setEraseIndex(0);setDetails(false);setPan(false);setDrawOptions(false);setSelectedId('');setSelectedCode('');setTool('inspect');setRoadStart(null);setDrawEnd(null);};
 const chooseBuilding=row=>{const allowed=cityBuildingLimit(data,row);if(!allowed.valid){setNotice(allowed.reason);return;}setPan(false);
  const parcel=citySuggestedParcel(data,row,center);setSelectedCode(row.code);setSelectedId('');setDraft({...parcel,rotation:0,modelSeed:modelSeed(row.code)});setCenter(parcel);setZoom(z=>Math.max(data.city?.city?.map_extent===500?18:4,z));setTool('build');setCatalog(false);setNotice('Touche le terrain pour choisir la parcelle.');
 };
 const selectPlacement=row=>{if(tool==='erase'){const targets=cityEraseTargets(data,{x:Number(row.x)+Number(row.footprint_w)/2,z:Number(row.z)+Number(row.footprint_h)/2});targets.sort((a,b)=>(b.kind==='building')-(a.kind==='building'));setEraseTargets(targets);setEraseIndex(0);setSelectedId('');setSelectedCode('');return;}setEraseTargets([]);setPan(false);setSelectedCode('');setSelectedId(row.id);setDraft({x:Number(row.x),z:Number(row.z),rotation:normalizeRotation(row.rotation)});setTool(row.placement_state==='stored'?'move':tool==='erase'?'erase':'inspect');setCatalog(false);};
 const followMission=()=>{
  if(mission?.status==='ready'){call('mission_claim',{mission:mission.code});return;}
  if(mission?.action?.building&&definitions.has(mission.action.building))chooseBuilding(definitions.get(mission.action.building));
  else if(mission?.action?.tool==='road'){clearSelection();setTool('road');}
  else onOpenPanel('missions');
 };
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){setHistory(Array.isArray(saved.history)?saved.history.slice(-30):[]);setFuture(Array.isArray(saved.future)?saved.future.slice(-30):[]);}}catch{}
 },[storageKey]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify({history:history.slice(-30),future:future.slice(-30)}));}catch{}},[storageKey,history,future]);
 useEffect(()=>{
  if(!focus)return;
  if(focus.building&&definitions.has(focus.building))chooseBuilding(definitions.get(focus.building));
  else if(focus.tool==='road'){clearSelection();setCatalog(false);setTool('road');}
 },[focus]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
 const commitHistory=action=>{setHistory(h=>[...h.slice(-29),action]);setFuture([]);};
 const save=async()=>{
  if(!activeDefinition||!validation?.valid||!affordable||!unlocked||!limit.valid||busy)return;
  const to={x:Math.round(draft.x),z:Math.round(draft.z),rotation:normalizeRotation(draft.rotation)};
  const key=JSON.stringify([selectedId,activeDefinition.code,to]);
  if(pendingRequest.current?.key!==key)pendingRequest.current={key,id:selectedPlacement?requestId():draft.modelSeed||modelSeed(activeDefinition.code)};
  const request=pendingRequest.current.id;
  if(selectedPlacement){
   const from={x:Number(selectedPlacement.x),z:Number(selectedPlacement.z),rotation:normalizeRotation(selectedPlacement.rotation)};
   const result=await call('move',{placement:selectedPlacement.id,...to,request});if(!result)return;
   commitHistory({kind:'move',placement:selectedPlacement.id,from,to});setTool('inspect');setNotice('Bâtiment installé.');
  }else{
   const result=await call('place',{building: activeDefinition.code,...to,request});if(!result)return;
   const created=(result.placements||[]).find(row=>row.request_id===request);
   if(created){commitHistory({kind:'place',placement:created.id,to});setSelectedId(created.id);setSelectedCode('');}
   seeds.current.delete(activeDefinition.code);refreshSeeds(n=>n+1);setTool('inspect');setNotice('Le chantier commence. Tu peux continuer à construire.');
  }
  setPan(false);pendingRequest.current=null;
 };
 const storePlacement=async()=>{
  if(!selectedPlacement||busy)return;
  const from={x:Number(selectedPlacement.x),z:Number(selectedPlacement.z),rotation:normalizeRotation(selectedPlacement.rotation)};
  if(!await call('store',{placement:selectedPlacement.id,request:requestId()}))return;
  commitHistory({kind:'store',placement:selectedPlacement.id,from});clearSelection();setNotice('Bâtiment rangé : retrouve-le dans Construire → Réserve.');
 };
 const applyHistory=async reverse=>{
  const action=(reverse?history:future).at(-1);if(!action||busy)return;
  if(action.kind==='display'){const result=reverse?await call('display',{item:action.from.item_instance_id,x:Number(action.from.x),z:Number(action.from.z),rotation:Number(action.from.rotation)||0}):await call('remove_display',{item:action.from.item_instance_id});if(!result)return;if(reverse){setHistory(h=>h.slice(0,-1));setFuture(f=>[...f,action]);}else{setFuture(f=>f.slice(0,-1));setHistory(h=>[...h,action]);}clearSelection();return;}
  if(action.kind==='roads'||action.kind==='terrain'||action.kind==='networks'||action.kind==='signals'){
   const current=action.kind==='roads'?roads:action.kind==='networks'?networks:action.kind==='signals'?signals:terrain,expected=reverse?action.to:action.from,target=reverse?action.from:action.to;
   if(!sameCityPlan(current,expected)){setNotice('La ville a changé depuis cette action. Recharge avant de la modifier.');return;}
   const result=await call(action.kind==='roads'?'plan_roads':action.kind==='networks'?'plan_networks':action.kind==='signals'?'plan_signals':'plan_terrain',action.kind==='roads'?{roads:target,expectedRoads:roads}:{features:target,expected:current});if(!result)return;
   if(reverse){setHistory(h=>h.slice(0,-1));setFuture(f=>[...f,action]);}else{setFuture(f=>f.slice(0,-1));setHistory(h=>[...h,action]);}setRoadStart(null);setDrawEnd(null);setNotice(reverse?'Tracé annulé.':'Tracé rétabli.');return;
  }
  const restore=(action.kind==='place'&&!reverse)||(action.kind==='store'&&reverse)||action.kind==='move';
  const point=action.kind==='move'?(reverse?action.from:action.to):action.kind==='place'?action.to:action.from;
  const result=restore?await call('move',{placement:action.placement,...point,request:requestId()}):await call('store',{placement:action.placement,request:requestId()});
  if(!result)return;clearSelection();
  if(reverse){setHistory(h=>h.slice(0,-1));setFuture(f=>[...f,action]);}else{setFuture(f=>f.slice(0,-1));setHistory(h=>[...h,action]);}
  setNotice(reverse?'Action annulée. Un bâtiment acheté reste dans ta réserve.':'Action rétablie.');
 };
 const roadPoint=point=>{if(busy)return;if(!roadStart){setRoadStart(point);setDrawEnd(null);}else setDrawEnd(point);};
 const stroke=(start,end)=>{if(busy)return;setRoadStart(start);setDrawEnd(end);};
 const hover=(point,start)=>{if(busy||pan)return;if(placing){if(start)setDraft(v=>({...v,...point}));return;}if(roadStart||start){if(!roadStart&&start)setRoadStart(start);setDrawEnd(point);}};
 const saveDrawing=async()=>{
  if(busy||!drawCheck.valid)return;
  const additions=drawPreview.map(f=>({...f,id:requestId()})),from=drawingList,to=[...from,...additions];
  if(to.length>(tool==='road'&&!networkTool?256:128)){setNotice('Limite du terrain atteinte. Retire un ancien tracé.');return;}
  const result=await call(drawingAction,drawingBody(to,from));
  if(!result)return;commitHistory({kind:drawingKind,from,to});
  setRoadStart(tool==='road'||landscapeKind==='river'?drawEnd:null);setDrawEnd(null);setNotice(tool==='road'?'Route enregistrée. Continue depuis son extrémité.':'Paysage enregistré dans ta ville.');
 };
 const removeLastDrawing=async()=>{const from=drawingList,to=from.slice(0,-1);if(!from.length||busy)return;const result=await call(drawingAction,drawingBody(to,from));if(result){commitHistory({kind:drawingKind,from,to});setRoadStart(null);setDrawEnd(null);}};
 const eraseTarget=eraseTargets[eraseIndex];
 const eraseDrawing=async()=>{if(busy)return;const plan=cityErasePlan(data,eraseTarget);if(!plan){setEraseTargets([]);setNotice('La sélection a changé. Touche à nouveau la construction.');return;}if(await call(plan.action,{...plan.body,...(plan.action==='store'?{request:requestId()}: {})})){commitHistory({kind:eraseTarget.kind==='building'?'store':eraseTarget.kind,placement:plan.placement,from:plan.from,to:plan.to});setEraseTargets([]);setNotice(plan.action==='store'?'Bâtiment retiré et conservé dans la réserve. Tu peux annuler.':'Construction retirée. Tu peux annuler.');}};
 const saveSignal=async()=>{if(busy||!signalTarget?.valid)return;const from=signals,node=signalTarget.node,existing=signalTarget.existing;const item={id:existing?.id||requestId(),x:node.x,z:node.z,mode:signalMode,green:signalGreen};const to=existing?signals.map(s=>s.id===existing.id?item:s):[...signals,item];if(await call('plan_signals',{features:to,expected:from})){commitHistory({kind:'signals',from,to});setNotice('Feux enregistrés. La circulation suit tes réglages.');setSignalPoint(null);}};
 const point=point=>{if(tool==='signal'){setSignalPoint(point);const target=citySignalTarget(data,point);setSignalMode(target.existing?.mode||'balanced');setSignalGreen(target.existing?.green||12);return;}if(tool==='erase'){setSelectedId('');setSelectedCode('');setEraseTargets(cityEraseTargets(data,point));setEraseIndex(0);return;}if(placing)setDraft(v=>({...v,...point}));else if(tool==='landscape'){if(landscapeKind==='river')roadPoint(point);else stroke(point,point);}else clearSelection();};
 const visibleSelection=activeDefinition&&!catalog&&!panelOpen;
 return <section className="city-game" aria-label="Jeu de construction 3D" data-tool={tool} data-catalog={catalog}>
  <City3DMap data={data} draft={draft} activeDefinition={placing?activeDefinition:null} activePlacement={placing?selectedPlacement:null} selectedId={tool==='erase'&&eraseTarget?.kind==='building'?eraseTarget.index:selectedId} onPoint={point} onSelect={selectPlacement} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} tool={tool} networkKind={networkKind} pan={pan} roadStart={roadStart} onRoadPoint={roadPoint} onStroke={stroke} onHover={hover} drawPreview={tool==='signal'&&signalTarget?.valid?[{kind:'signal',...signalTarget.node}]:tool==='erase'&&eraseTarget&&eraseTarget.kind!=='building'?[eraseTarget.feature]:drawPreview} landscapeKind={landscapeKind} premiumCodes={premiumCodes} />
  <header className="city-game-hud">
   <div className="city-game-name"><b>3B</b><div><strong>{city.name}</strong><small>{busy?'Enregistrement…':'CRÉE MA VILLE'}</small></div></div>
   <div className="city-game-resources">
    <div className="city-game-level" title={`${city.city_xp||0} XP ville`}><strong>Niv. {city.city_level||1}</strong><progress value={level.percent} max="100" aria-label="Progression du niveau"/></div>
    <span aria-label="Coins disponibles"><Coins size={17}/><b>{Number(data.wallet?.coins||0).toLocaleString('fr-FR')}</b></span>
    <Button variant="ghost" aria-label="Population et besoins" onClick={()=>onOpenPanel('life')}><Users size={17}/>{data.life?.available?data.life.population:'—'}<Heart size={15}/>{data.life?.available?`${data.life.happiness}%`:'—'}</Button>
   </div>
   <div className="city-game-system">{onFullscreen&&<Button variant="ghost" aria-label="Plein écran" onClick={onFullscreen}><Maximize2 size={18}/></Button>}<Button variant="ghost" aria-label="Réglages du jeu" onClick={()=>onOpenPanel('settings')}><Settings2 size={18}/></Button>{onClose&&<Button variant="ghost" aria-label="Quitter la ville" onClick={onClose}><X size={18}/></Button>}</div>
  </header>
  {!panelOpen&&!catalog&&!visibleSelection&&!['road','landscape','erase'].includes(tool)&&mission&&<Button variant="ghost" className="city-game-objective" disabled={busy} onClick={followMission}><Flag size={18}/><span><small>{mission.status==='ready'?'OBJECTIF ACCOMPLI':'PROCHAIN OBJECTIF'}</small><strong>{mission.title}</strong></span><b>{mission.status==='ready'?`+${mission.coins}`:'→'}</b></Button>}
  {!panelOpen&&!catalog&&!visibleSelection&&(sites.length>0||ready.length>0)&&<Button variant="ghost" className="city-game-sites" onClick={()=>{const row=ready[0]||sites[0];selectPlacement(row);setCenter({x:row.x,z:row.z});setZoom(data.city?.city?.map_extent===500?24:6);}}>{ready.length?<Gift size={17}/>:<HardHat size={17}/>} {ready.length?`${ready.length} inauguration${ready.length>1?'s':''}`:`${sites.length} chantier${sites.length>1?'s':''}`}</Button>}
  {notice&&!panelOpen&&<div className="city-game-toast" role="status">{notice}</div>}
  {visibleSelection&&<aside className="city-game-inspector" data-placing={placing} data-details={details} aria-label="Bâtiment sélectionné">
   <div className="city-game-inspector-title"><span><small>{placing?'PLACEMENT':progress.label.toUpperCase()}</small><strong>{activeDefinition.name}</strong></span><Button variant="ghost" aria-label="Fermer la sélection" onClick={clearSelection}><X size={18}/></Button></div>
   <Button variant="ghost" className="city-game-details-toggle" aria-expanded={details} onClick={()=>setDetails(!details)}>{details?'Masquer les détails':'Détails'}</Button><p className="city-game-building-benefit">{cityBuildingBenefit(activeDefinition)}</p>
   {selectedPlacement&&!placing&&progress.progress<1&&<><div className="city-game-construction-meter"><progress value={progress.progress} max="1" aria-label="Avancement du chantier"/><strong>{progress.remaining}s</strong></div><small>Fondations → structure → finitions</small></>}
   {selectedPlacement&&!placing&&progress.ready&&<Button variant="champagne" disabled={busy} onClick={()=>call('construction_claim',{placement:selectedPlacement.id})}><Gift size={17}/> Inaugurer</Button>}
   {placing?<>
    {!selectedPlacement&&<small>{activeDefinition.cost_coins||0} Coins · chantier de {cityConstructionDuration(activeDefinition)}s</small>}
    <p className="city-game-validation" data-valid={validation?.valid&&affordable&&unlocked&&limit.valid} role="status">{!limit.valid?limit.reason:!unlocked?`Disponible au niveau ${activeDefinition.unlock_level}`:!affordable?`Il manque ${Number(activeDefinition.cost_coins)-Number(data.wallet?.coins||0)} Coins`:validation?.reason}</p>
    <div className="city-game-selection-actions"><Button variant={pan?'champagne':'ghost'} aria-label="Déplacer la caméra pendant le placement" aria-pressed={pan} onClick={()=>setPan(!pan)}><Move size={17}/></Button><Button variant="ghost" aria-label="Tourner le bâtiment" onClick={()=>setDraft(v=>({...v,rotation:normalizeRotation(v.rotation+90)}))}><RotateCw size={18}/></Button><Button variant="champagne" disabled={busy||!validation?.valid||!affordable||!unlocked||!limit.valid} onClick={save}><Check size={18}/>{selectedPlacement?'Installer':`Construire · ${activeDefinition.cost_coins||0} Coins`}</Button></div>
   </>:<div className="city-game-selection-actions" data-secondary="true"><Button variant="ghost" disabled={busy} onClick={()=>setTool('move')}><Move size={17}/> Déplacer</Button><Button variant="ghost" disabled={busy} onClick={storePlacement}><PackageOpen size={17}/>{tool==='erase'?'Supprimer du terrain':'Ranger'}</Button></div>}
  </aside>}
  {['road','landscape'].includes(tool)&&!panelOpen&&<aside className="city-game-drawing" data-options={drawOptions} aria-label="Tracé et paysage">
   <div className="city-game-drawing-title">{tool==='road'&&<select aria-label="Type de voie ou réseau" value={networkKind==='road'?`road:${roadType}`:networkKind} onChange={e=>{const [kind,model]=e.target.value.split(':');setNetworkKind(kind);if(model)setRoadType(model);setRoadStart(null);setDrawEnd(null);}}><optgroup label="Routes et chemins">{CITY_ROAD_TYPES.map(t=><option key={t.id} value={`road:${t.id}`} disabled={Number(city.city_level||1)<t.level}>{t.label} · {t.width} m{Number(city.city_level||1)<t.level?` · niv. ${t.level}`:''}</option>)}</optgroup><optgroup label="Ouvrages et réseaux">{CITY_NETWORK_TOOLS.filter(([id])=>id!=='road').map(([id,label,level])=><option key={id} value={id} disabled={Number(city.city_level||1)<level}>{label}{Number(city.city_level||1)<level?` · niv. ${level}`:''}</option>)}</optgroup></select>}<strong>{tool==='road'?'2 points':LANDSCAPE_TOOLS.find(([id])=>id===landscapeKind)?.[1]}</strong><Button variant="ghost" aria-label="Options du tracé" aria-expanded={drawOptions} onClick={()=>setDrawOptions(!drawOptions)}><Settings2 size={16}/></Button><Button variant="ghost" aria-label="Fermer le tracé" onClick={clearSelection}><X size={18}/></Button></div>
   <div className="city-game-drawing-options">{tool==='landscape'?<select aria-label="Outil de paysage" value={landscapeKind} onChange={e=>{const id=e.target.value;setLandscapeKind(id);setLandscapeWidth(LANDSCAPE_WIDTHS[id][1]||LANDSCAPE_WIDTHS[id][0]);setRoadStart(null);setDrawEnd(null);}}>{LANDSCAPE_TOOLS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>:<select aria-label="Forme de la route" value={roadMode} onChange={e=>setRoadMode(e.target.value)}><option value="straight">Droite</option><option value="corner">Angle droit</option></select>}
   {tool==='road'&&!networkTool&&roadType==='oneway'&&<Button variant="ghost" disabled={!drawEnd} onClick={()=>{setRoadStart(drawEnd);setDrawEnd(roadStart);}}>Inverser</Button>}{tool==='road'?<span>Largeur fixe : {roadWidth} m{!networkTool&&roadType==='oneway'?' · du 1er vers le 2e point':''}</span>:<label>Taille <select aria-label="Largeur du paysage" value={landscapeWidth} onChange={e=>setLandscapeWidth(Number(e.target.value))}>{LANDSCAPE_WIDTHS[landscapeKind].map(w=><option key={w} value={w}>{w} m</option>)}</select></label>}</div>
   {tool==='road'&&roadType==='oneway'&&!networkTool&&<p role="status">Sens : premier point → deuxième point.</p>}<p className="city-game-gesture-hint">{tool==='road'||landscapeKind==='river'?'Glisse ou touche deux points.':'Touche le terrain pour placer.'}</p>
   {drawPreview.length>0&&!drawCheck.valid&&<p role="status" data-valid={drawCheck.valid}>{drawCheck.reason}</p>}
   <div className="city-game-selection-actions"><Button variant={pan?'champagne':'ghost'} aria-label="Déplacer la caméra pendant le tracé" aria-pressed={pan} onClick={()=>setPan(!pan)}><Move size={17}/></Button><Button variant="champagne" disabled={busy||!drawCheck.valid} onClick={saveDrawing}><Check size={17}/>Valider</Button><Button variant="ghost" disabled={Number(city.city_level||1)<3} onClick={()=>{setTool('signal');setRoadStart(null);setDrawEnd(null);setSignalPoint(null);}}>Feux{Number(city.city_level||1)<3?' · niv. 3':''}</Button><Button variant="ghost" disabled={!roadStart} onClick={()=>{setRoadStart(null);setDrawEnd(null);}} aria-label="Recommencer le tracé"><RotateCw size={17}/></Button><Button variant="ghost" disabled={busy||!drawingList.length} onClick={removeLastDrawing} aria-label="Retirer le dernier tracé"><Undo2 size={17}/></Button></div>
  </aside>}
  {tool==='signal'&&!panelOpen&&<aside className="city-game-drawing" data-options="true" aria-label="Feux de circulation"><div className="city-game-drawing-title"><strong>Feux · carrefours</strong><Button variant="ghost" onClick={()=>{setTool('road');setSignalPoint(null);}} aria-label="Retour aux routes"><X size={18}/></Button></div><p role="status">{signalTarget?.reason||'Touche le carrefour où tu veux installer ou régler les feux.'}</p><div className="city-game-drawing-options"><select aria-label="Priorité du carrefour" value={signalMode} onChange={e=>setSignalMode(e.target.value)}><option value="balanced">Équilibré</option><option value="x">Priorité axe bleu</option><option value="z">Priorité axe or</option></select><select aria-label="Durée du feu vert" value={signalGreen} onChange={e=>setSignalGreen(Number(e.target.value))}>{[8,12,20].map(g=><option key={g} value={g}>{g} s de vert</option>)}</select></div><div className="city-game-selection-actions"><Button variant="champagne" disabled={busy||!signalTarget?.valid} onClick={saveSignal}><Check size={17}/>{signalTarget?.existing?'Enregistrer':'Installer'}</Button><Button variant="ghost" onClick={()=>{setTool('erase');setSignalPoint(null);}}>Supprimer un feu</Button></div></aside>}
  {tool==='erase'&&!panelOpen&&!visibleSelection&&<aside className="city-game-drawing city-game-eraser" aria-label="Supprimer une construction"><div className="city-game-drawing-title"><strong><Eraser size={17}/> Gomme</strong><Button variant="ghost" aria-label="Fermer la gomme" onClick={clearSelection}><X size={18}/></Button></div>{eraseTarget?<><select aria-label="Construction à retirer" value={eraseIndex} onChange={e=>setEraseIndex(Number(e.target.value))}>{eraseTargets.map((t,i)=><option key={i} value={i}>{t.label} · {i+1}</option>)}</select><Button variant="champagne" disabled={busy} onClick={eraseDrawing}><Eraser size={17}/> Supprimer {eraseTarget.label.toLowerCase()}</Button></>:<p>Touche un bâtiment, une route ou un décor. Tu peux annuler chaque retrait.</p>}</aside>}
  {catalog&&!panelOpen&&<section className="city-game-catalog" aria-label="Catalogue de construction">
   <div className="city-game-catalog-head"><nav aria-label="Types de construction">{CITY_BUILD_CATEGORIES.map(([id,label])=><Button variant="ghost" key={id} aria-pressed={!showStored&&category===id} onClick={()=>{setCategory(id);setShowStored(false);}}>{label}</Button>)}<Button variant="ghost" aria-pressed={showStored} onClick={()=>setShowStored(true)}>Réserve {stored.length>0?`(${stored.length})`:''}</Button></nav><label><Search size={16}/><input aria-label="Rechercher un bâtiment" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher"/></label><Button variant="ghost" aria-label="Fermer le catalogue" onClick={()=>setCatalog(false)}><X size={18}/></Button></div>
   <div className="city-game-catalog-list">{(showStored?stored:buildings).slice(0,catalogLimit).map(row=>{
    const definition=showStored?definitions.get(row.building_code)||{}:row,locked=!showStored&&Number(definition.unlock_level)>Number(city.city_level||1);
    return <Button variant="ghost" className="city-game-building" key={row.id||row.code} disabled={locked||busy||(!showStored&&!cityBuildingLimit(data,definition).valid)} onClick={()=>showStored?selectPlacement(row):chooseBuilding(row)}><CityBuildingPreview definition={definition} placement={showStored?row:{request_id:modelSeed(definition.code)}}/><strong>{definition.name||row.building_code}</strong><small>{cityBuildingBenefit(definition)}</small><b>{showStored?'Replacer':locked?`Niveau ${definition.unlock_level}`:!cityBuildingLimit(data,definition).valid?'Déjà construite':`${definition.cost_coins||0} Coins`}</b></Button>;
   })}{(showStored?stored:buildings).length>catalogLimit&&<Button variant="ghost" onClick={()=>setCatalogLimit(n=>n+36)}>Afficher les suivants</Button>}{!(showStored?stored:buildings).length&&<p>{showStored?'Tes bâtiments rangés apparaîtront ici.':'Aucun bâtiment trouvé.'}</p>}</div>
  </section>}
  {!panelOpen&&<footer className="city-game-bottom"><div className="city-game-history"><Button variant="ghost" aria-label="Annuler la dernière action" disabled={busy||!history.length} onClick={()=>applyHistory(true)}><Undo2 size={17}/></Button><Button variant="ghost" aria-label="Rétablir la dernière action" disabled={busy||!future.length} onClick={()=>applyHistory(false)}><Redo2 size={17}/></Button></div><nav aria-label="Outils de la ville"><Button variant={catalog?'champagne':'ghost'} aria-pressed={catalog} onClick={()=>{clearSelection();setCatalog(!catalog);}}><Building2 size={20}/>Construire</Button><Button variant={['road','signal'].includes(tool)?'champagne':'ghost'} aria-pressed={['road','signal'].includes(tool)} onClick={()=>{clearSelection();setCatalog(false);setTool(tool==='road'?'inspect':'road');}}><Route size={20}/>Routes</Button><Button variant={tool==='landscape'?'champagne':'ghost'} aria-pressed={tool==='landscape'} onClick={()=>{clearSelection();setCatalog(false);setTool(tool==='landscape'?'inspect':'landscape');}}><Waves size={20}/>Paysage</Button><Button variant={tool==='erase'?'champagne':'ghost'} aria-pressed={tool==='erase'} onClick={()=>{clearSelection();setCatalog(false);setTool(tool==='erase'?'inspect':'erase');}}><Eraser size={20}/>Supprimer</Button><Button variant="ghost" onClick={()=>onOpenPanel('missions')}><Flag size={20}/>Objectifs</Button><Button variant="ghost" onClick={()=>onOpenPanel('life')}><Users size={20}/>Ma ville</Button></nav></footer>}
 </section>;
}

export function City3BPrivatePreview({data,premiumCodes=EMPTY_PREMIUM_CODES}){
 const [view,setView]=useState(()=>cityMapInitialView(data));
 return <div className="city-game-visit"><City3DMap data={data} draft={{x:0,z:0,rotation:0}} zoom={view.zoom} setZoom={fn=>setView(v=>({...v,zoom:typeof fn==='function'?fn(v.zoom):fn}))} center={view.center} setCenter={center=>setView(v=>({...v,center}))} previewOnly premiumCodes={premiumCodes}/></div>;
}
