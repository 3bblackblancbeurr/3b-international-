import {useEffect} from 'react';

/**
 * Keeps one canonical viewport/input profile on <html>.
 * We intentionally rely on viewport capability rather than user-agent sniffing,
 * so foldables, tablets, PWA windows and desktop resizing all get the right UI.
 */
export default function useViewportProfile(){
 useEffect(()=>{
  const root=document.documentElement;
  const phone=window.matchMedia('(max-width: 720px)');
  const tablet=window.matchMedia('(max-width: 1024px)');
  const coarse=window.matchMedia('(pointer: coarse)');
  const portrait=window.matchMedia('(orientation: portrait)');
  const viewport=window.visualViewport;
  let frame=0;

  const apply=()=>{
   root.dataset.viewport=phone.matches?'phone':tablet.matches?'tablet':'desktop';
   root.dataset.input=coarse.matches?'touch':'precision';
   root.dataset.orientation=portrait.matches?'portrait':'landscape';
   root.style.setProperty('--app-viewport-height',(viewport?.height||window.innerHeight)+'px');
   root.style.setProperty('--app-viewport-offset-top',(viewport?.offsetTop||0)+'px');
  };
  const schedule=()=>{
   if(frame)return;
   frame=window.requestAnimationFrame(()=>{frame=0;apply();});
  };

  const queries=[phone,tablet,coarse,portrait];
  queries.forEach(query=>query.addEventListener?.('change',schedule));
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  viewport?.addEventListener('resize',schedule,{passive:true});
  viewport?.addEventListener('scroll',schedule,{passive:true});
  apply();

  return()=>{
   queries.forEach(query=>query.removeEventListener?.('change',schedule));
   window.removeEventListener('resize',schedule);
   window.removeEventListener('orientationchange',schedule);
   viewport?.removeEventListener('resize',schedule);
   viewport?.removeEventListener('scroll',schedule);
   window.cancelAnimationFrame(frame);
   delete root.dataset.viewport;
   delete root.dataset.input;
   delete root.dataset.orientation;
   root.style.removeProperty('--app-viewport-height');
   root.style.removeProperty('--app-viewport-offset-top');
  };
 },[]);
}
