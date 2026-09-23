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

  const apply=()=>{
   root.dataset.viewport=phone.matches?'phone':tablet.matches?'tablet':'desktop';
   root.dataset.input=coarse.matches?'touch':'precision';
   root.dataset.orientation=portrait.matches?'portrait':'landscape';
   root.style.setProperty('--app-viewport-height',window.innerHeight+'px');
  };

  const queries=[phone,tablet,coarse,portrait];
  queries.forEach(query=>query.addEventListener?.('change',apply));
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('orientationchange',apply,{passive:true});
  apply();

  return()=>{
   queries.forEach(query=>query.removeEventListener?.('change',apply));
   window.removeEventListener('resize',apply);
   window.removeEventListener('orientationchange',apply);
   delete root.dataset.viewport;
   delete root.dataset.input;
   delete root.dataset.orientation;
   root.style.removeProperty('--app-viewport-height');
  };
 },[]);
}
