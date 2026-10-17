import {lazy,Suspense,useEffect,useState} from 'react';
import HeritageGlobeLite from './HeritageGlobeLite.jsx';

// A true 3D renderer only loads on suitable desktop GPUs. Phones and reduced
// motion use the same premium NASA imagery without WebGL startup/freeze costs.
const HeritageGlobe3D=lazy(()=>import('./HeritageGlobe3D.jsx'));
function shouldEnhance(){
 if(typeof window==='undefined')return false;
 const fine=window.matchMedia?.('(min-width: 721px) and (hover: hover) and (pointer: fine)')?.matches;
 const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const saveData=Boolean(navigator.connection?.saveData);
 const memory=navigator.deviceMemory;
 const cores=navigator.hardwareConcurrency;
 const economical=document.documentElement.dataset.experienceQuality==='economical';
 return Boolean(fine&&!motion&&!saveData&&!economical&&(memory==null||memory>=4)&&(cores==null||cores>=6));
}
export default function AdaptiveHeritageGlobe(props){
 const [enhanced,setEnhanced]=useState(false);
 useEffect(()=>{
  const update=()=>setEnhanced(shouldEnhance());
  const queries=[
   window.matchMedia?.('(min-width: 721px) and (hover: hover) and (pointer: fine)'),
   window.matchMedia?.('(prefers-reduced-motion: reduce)')
  ].filter(Boolean);
  update();queries.forEach(q=>q.addEventListener?.('change',update));
  return()=>queries.forEach(q=>q.removeEventListener?.('change',update));
 },[]);
 if(!enhanced)return <HeritageGlobeLite {...props}/>;
 return <Suspense fallback={<HeritageGlobeLite {...props}/>}><HeritageGlobe3D {...props}/></Suspense>;
}
