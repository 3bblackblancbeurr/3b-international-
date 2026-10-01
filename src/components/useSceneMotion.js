import {useEffect,useRef,useState} from 'react';

export default function useSceneMotion(options={}){
 const ref=useRef(null);
 const [paused,setPaused]=useState(false);
 const [visible,setVisible]=useState(false);
 const [foreground,setForeground]=useState(()=>typeof document==='undefined'||document.visibilityState==='visible');
 const [systemReduced,setSystemReduced]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setSystemReduced(media.matches);
  const visibility=()=>setForeground(document.visibilityState==='visible');
  media.addEventListener('change',change);
  document.addEventListener('visibilitychange',visibility);
  let observer;
  if(typeof IntersectionObserver==='function'){
   observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'80px'});
   if(ref.current)observer.observe(ref.current);
  }else setVisible(true);
  return()=>{observer?.disconnect();media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const allowed=options.animations!==false&&!options.reducedMotion&&!systemReduced;
 return {ref,allowed,paused,toggle:()=>setPaused(value=>!value),playing:allowed&&!paused&&visible&&foreground};
}
