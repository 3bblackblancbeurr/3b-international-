import React,{Suspense,lazy} from 'react';
const CurrentWorld=lazy(()=>import('./WorldPage.jsx'));

// Canonical World 3B entrypoint. The former Origins engine is no longer exposed.
export default function WorldEntry({goTo}){
 return <Suspense fallback={<div className="world-loading">Ouverture du Monde 3B…</div>}>
  <CurrentWorld goTo={goTo}/>
 </Suspense>;
}
