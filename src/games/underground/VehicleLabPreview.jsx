import React,{useEffect,useRef,useState} from 'react';
import {createModularVehicleProxy} from './ModularVehicleProxy.js';
import {upgradeVehicleProxyV7} from './VehicleProxyV7.js';
import {hasProductionVehicleAsset,loadProductionVehicle} from './ProductionVehicleLoader.js';
import {INSPECTION_PRESETS,inspectionState} from './vehicleInspection.js';
import {GarageStageV2,GARAGE_VIEWS,disposeGarageVehicle,garageBrightness} from './GarageStageV2.js';
import './vehicle-lab.css';

const LIGHT_STORAGE='3b_underground_garage_light_v2';
function loadBrightness(){try{return garageBrightness(JSON.parse(localStorage.getItem(LIGHT_STORAGE)||'1'));}catch{return 1;}}

export default function VehicleLabPreview({vehicle}){
  const canvas=useRef(null),runtime=useRef(null),request=useRef(0);
  const[preset,setPreset]=useState('exterior'),[assetState,setAssetState]=useState('loading');
  const[error,setError]=useState(''),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false),[auto,setAuto]=useState(false);
  const[brightness,setBrightness]=useState(loadBrightness);
  useEffect(()=>{
    let stage;setError('');
    try{stage=new GarageStageV2(canvas.current,{onError:setError,onInteract:()=>setAuto(false)});runtime.current=stage;stage.setBrightness(brightness);}
    catch(e){setError(e.message||'Ce navigateur ne peut pas afficher le garage 3D.');return;}
    return()=>{request.current++;runtime.current=null;stage.dispose();};
  },[retry]);
  useEffect(()=>{
    const stage=runtime.current;if(!stage)return;
    const id=++request.current;setAssetState('loading');
    const install=(model,state)=>{
      if(id!==request.current||stage.disposed){disposeGarageVehicle(model);return;}
      stage.setModel(model);setAssetState(state);
    };
    if(hasProductionVehicleAsset(vehicle)){
      loadProductionVehicle(vehicle).then(model=>{
        if(!model)throw new Error('Modèle vide.');
        install(model,model.userData?.productionMeta?.candidate?'candidate':'ready');
      }).catch(()=>{
        if(id===request.current&&!stage.disposed)install(upgradeVehicleProxyV7(createModularVehicleProxy(vehicle)),'fallback');
      });
    }else install(upgradeVehicleProxyV7(createModularVehicleProxy(vehicle)),'proxy');
    return()=>{if(request.current===id)request.current++;};
  },[vehicle,retry]);
  useEffect(()=>{
    const stage=runtime.current;if(!stage)return;
    const chosen=GARAGE_VIEWS[preset]||INSPECTION_PRESETS[preset]||GARAGE_VIEWS.exterior;
    if(stage.model)stage.model.userData.inspectionState=inspectionState(vehicle,INSPECTION_PRESETS[preset]?preset:'exterior');
    stage.selectView(chosen);
  },[preset,assetState,retry]);
  useEffect(()=>{runtime.current?.setBrightness(brightness);try{localStorage.setItem(LIGHT_STORAGE,JSON.stringify(brightness));}catch{}},[brightness]);
  useEffect(()=>{
    if(!expanded)return;
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setExpanded(false);}};
    window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
  },[expanded]);
  const select=id=>{setAuto(false);setPreset(id);if(id===preset)runtime.current?.selectView(GARAGE_VIEWS[id]||INSPECTION_PRESETS[id]);};
  const toggleAuto=()=>{const next=!auto;setAuto(next);runtime.current?.setAutoRotate(next);};
  const label={ready:'MODÈLE 3D',candidate:'MONTARA · CANDIDATE PBR',loading:'CHARGEMENT 3D…',fallback:'APERÇU DE SECOURS',proxy:'PROTOTYPE 3D'}[assetState];
  return <section className={`u3b-lab-preview u3b-showroom-v2${expanded?' is-expanded':''}`} aria-label="Garage automobile 3B" data-garage="modern-showroom-v2">
    <header className="u3b-showroom-heading"><div><span>3B UNDERGROUND / ATELIER 01</span><h2>{vehicle.name||'Mon véhicule'}</h2></div><button type="button" onClick={()=>setExpanded(v=>!v)} aria-label={expanded?'Réduire le garage':'Agrandir le garage'}>{expanded?'RÉDUIRE':'AGRANDIR'} ↗</button></header>
    <div className="u3b-lab-stage"><canvas ref={canvas} aria-label="Voiture dans le garage 3D, faire glisser pour tourner et pincer pour zoomer"/><span className="u3b-showroom-status">{label}</span>
      <div className="u3b-showroom-zoom"><button type="button" aria-label="Zoom avant" onClick={()=>runtime.current?.zoom(.88)}>+</button><button type="button" aria-label="Zoom arrière" onClick={()=>runtime.current?.zoom(1.14)}>−</button></div>
      {error&&<div className="u3b-showroom-error" role="alert"><strong>Le garage 3D ne s’affiche pas</strong><p>{error}</p><button type="button" onClick={()=>{setAssetState('loading');setRetry(v=>v+1);}}>Relancer le rendu</button></div>}
    </div>
    <div className="u3b-showroom-toolbar"><nav aria-label="Vues du véhicule">{Object.values(GARAGE_VIEWS).map(view=><button type="button" key={view.id} className={preset===view.id?'active':''} aria-pressed={preset===view.id} onClick={()=>select(view.id)}>{view.label}</button>)}<button type="button" aria-pressed={auto} onClick={toggleAuto}>{auto?'Arrêter la rotation':'Rotation 360°'}</button><button type="button" onClick={()=>select('exterior')}>Recentrer</button></nav>
      <label className="u3b-showroom-brightness"><span>Lumière</span><input aria-label="Luminosité du garage" type="range" min=".9" max="1.45" step=".05" value={brightness} onChange={e=>setBrightness(garageBrightness(e.target.value))}/><output>{Math.round(brightness*100)}%</output></label>
    </div>
    <details className="u3b-showroom-inspection"><summary>Inspection détaillée — roues, habitacle, moteur</summary><div className="u3b-lab-presets">{Object.values(INSPECTION_PRESETS).filter(p=>!['exterior','front'].includes(p.id)).map(p=><button type="button" key={p.id} className={preset===p.id?'active':''} onClick={()=>select(p.id)}>{p.label}</button>)}</div></details>
  </section>;
}
