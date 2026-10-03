import {Button} from '../design-system/index.jsx';
import {useEffect,useRef,useState} from 'react';
import {citySceneSignature} from './city3b-building-progress.js';
import {cityConstructionIsNight} from './city3b-environment.js';
import './city3b-playable.css';

export default function City3DMap(props){
 const host=useRef(null),engine=useRef(null),latest=useRef(props),signature=useRef('');latest.current=props;
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const sceneKey=citySceneSignature(props.data,props.premiumCodes);
 useEffect(()=>{
  let live=true;setReady(false);setError('');
  import('./city3b-scene.js').then(({createCityScene})=>{
   if(!live)return;
   const instance=createCityScene(host.current,{
    onPoint:point=>{const p=latest.current;if(p.tool==='road')p.onRoadPoint?.(point);else p.onPoint?.(point);},
    onStroke:(start,end)=>latest.current.onStroke?.(start,end),onHover:(point,start)=>latest.current.onHover?.(point,start),
    onSelect:row=>latest.current.onSelect?.(row),onError:message=>{if(live)setError(message);},
   });
   engine.current=instance;signature.current=citySceneSignature(latest.current.data,latest.current.premiumCodes);
   instance.rebuild(latest.current.data,latest.current.premiumCodes);instance.setView({center:latest.current.center,zoom:latest.current.zoom});instance.updateDraft(latest.current);setReady(true);
  }).catch(()=>{if(live)setError('Le rendu 3D n’a pas pu démarrer. Ferme les autres applications puis réessaie. Tes constructions restent sauvegardées.');});
  return()=>{live=false;engine.current?.dispose();engine.current=null;};
 },[attempt]);
 useEffect(()=>{if(ready&&signature.current!==sceneKey){signature.current=sceneKey;engine.current?.rebuild(props.data,props.premiumCodes);}},[ready,sceneKey]);
 useEffect(()=>{engine.current?.syncClock(props.data.serverTime);},[ready,props.data.serverTime]);
 useEffect(()=>{engine.current?.updateDraft(props);},[ready,props.draft,props.activeDefinition,props.activePlacement,props.selectedId,props.tool,props.networkKind,props.pan,props.roadStart,props.drawPreview,props.drawValidation,props.landscapeKind,props.previewOnly]);
 useEffect(()=>{engine.current?.setView({center:props.center,zoom:props.zoom});},[props.center,props.zoom]);
 return <div className="city3d-shell" data-night={cityConstructionIsNight(props.data.city)}>
  <div className="city3d-viewport" ref={host}/>
  {!ready&&!error&&<div className="city3d-loading" role="status">Ouverture de ta ville…</div>}
  {error&&<div className="city3d-error" role="alert">{error}<Button variant="champagne" onClick={()=>setAttempt(v=>v+1)}>Relancer la 3D</Button></div>}
  <div className="city3d-gesture-guide" aria-label="Commandes de caméra">
   <span className="city3d-guide-mouse">Glisser ou maintenir la molette · Molette : zoom · Clic droit : tourner · Q/E : rotation · H : recentrer</span>
   <span className="city3d-guide-touch">Deux doigts : déplacer, pincer et tourner</span>
  </div>
 </div>;
}
