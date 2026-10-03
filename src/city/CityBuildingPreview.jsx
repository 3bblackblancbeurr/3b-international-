import {useEffect,useRef,useState} from 'react';
import {cityModelThumbnail} from './city3b-model-preview.js';
export default function CityBuildingPreview({definition,placement}){
 const ref=useRef(null),[source,setSource]=useState('');
 const w=placement?.footprint_w,h=placement?.footprint_h,rot=Number(placement?.rotation)||0;
 useEffect(()=>{
  let live=true;setSource('');const render=()=>{if(live)setSource(cityModelThumbnail(definition,w&&h?(rot%180?{w:h,h:w}:{w,h}):undefined));};
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){render();observer.disconnect();}},{rootMargin:'100px'}):null;
  if(observer&&ref.current)observer.observe(ref.current);else render();return()=>{live=false;observer?.disconnect();};
 },[definition,w,h,rot]);
 return <span className="city-game-building-model" ref={ref}>{source?<img src={source} alt={`Aperçu du modèle construit : ${definition.name}`} width="320" height="240"/>:<span aria-hidden="true">3B</span>}</span>;
}
