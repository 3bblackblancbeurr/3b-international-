import {Button} from '../design-system/index.jsx';
import {useEffect,useRef,useState} from 'react';
import {cityMapBlueprint} from './city3b-map.js';
import {cityFootprint,cityPlacementCheck} from './city3b-construction.js';
import {cityIsNight} from './city3b-environment.js';
import './city3b-playable.css';

export default function City3DMap(props){
  const host=useRef(null),engine=useRef(null),latest=useRef(props);
  latest.current=props;
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    import('./city3b-scene.js').then(({createCityScene})=>{
      if(!live)return;
      const instance=createCityScene(host.current,{
        onPoint:point=>{const p=latest.current;if(p.tool==='road')p.onRoadPoint?.(point);else p.onPoint?.(point);},
        onSelect:row=>latest.current.onSelect?.(row),onError:message=>{if(live)setError(message);},
      });
      engine.current=instance;
      instance.rebuild(latest.current.data,latest.current.premiumCodes);
      instance.setView({center:latest.current.center,zoom:latest.current.zoom});
      instance.updateDraft(latest.current);setReady(true);
    }).catch(()=>{if(live)setError('La 3D est indisponible sur cet appareil. Utilise le plan 2D pour continuer à construire.');});
    return()=>{live=false;engine.current?.dispose();engine.current=null;};
  },[]);
  useEffect(()=>{if(ready)engine.current?.rebuild(props.data,props.premiumCodes);},[ready,props.data,props.premiumCodes]);
  useEffect(()=>{engine.current?.updateDraft(props);},[ready,props.draft,props.activeDefinition,props.activePlacement,props.tool,props.roadStart,props.previewOnly]);
  useEffect(()=>{engine.current?.setView({center:props.center,zoom:props.zoom});},[props.center,props.zoom]);
  const plan=cityMapBlueprint(props.data),size=props.activeDefinition||props.activePlacement?cityFootprint(props.activeDefinition,props.draft?.rotation,props.activePlacement):null;
  const check=size?cityPlacementCheck(props.data,props.draft,size,props.activePlacement?.id):null;
  return <div className="city3d-shell" data-night={cityIsNight(props.data.city)}>
    <div className="city3d-viewport" ref={host}/>
    {!ready&&!error&&<div className="city3d-loading" role="status">Ouverture de ta ville…</div>}
    {error&&<div className="city3d-error" role="alert">{error}<Button variant="ghost" type="button" onClick={props.onPlan}>Ouvrir le plan 2D</Button></div>}
    <div className="city3d-location"><span>CRÉE MA VILLE <b>3B</b></span><strong>{props.data.city?.name}</strong><small>{props.tool==='road'?'Touche le départ puis l’arrivée':props.previewOnly?'Explore ta ville':'Choisis un bâtiment, puis touche une parcelle'}</small></div>
    <div className="city3d-controls" aria-label="Caméra de la ville">
      <Button variant="ghost" type="button" aria-label="Zoomer" onClick={()=>props.setZoom(z=>Math.min(12,z*1.3))}>+</Button>
      <Button variant="ghost" type="button" aria-label="Dézoomer" onClick={()=>props.setZoom(z=>Math.max(.65,z/1.3))}>−</Button>
      <Button variant="ghost" type="button" aria-label="Tourner la caméra" onClick={()=>engine.current?.rotate()}>↻</Button>
      <Button variant="ghost" type="button" onClick={()=>{props.setCenter({x:0,z:0});props.setZoom(2.5);}}>Centre</Button>
      <Button variant="ghost" type="button" onClick={()=>{props.setCenter({x:0,z:plan.coastZ-8});props.setZoom(3.5);}}>Lac</Button>
    </div>
    <div className="city3d-districts"><select aria-label="Aller dans un quartier" defaultValue="" onChange={e=>engine.current?.district(e.target.value)}><option value="">Centre-ville</option>{plan.districts.filter(d=>d.unlocked).map(d=><option key={d.code} value={d.code}>{d.country}</option>)}</select><span>Glisser · déplacer / 2 doigts · zoomer</span></div>
    {check&&!props.previewOnly&&<div className="city3d-placement" data-valid={check.valid} role="status">{check.valid?'✓':'!'} {check.reason} · {size.width} × {size.height}</div>}
  </div>;
}
