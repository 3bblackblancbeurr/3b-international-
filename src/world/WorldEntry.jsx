import React,{Suspense,lazy} from 'react';
const CurrentWorld=lazy(()=>import('./WorldPage.jsx'));

// Monde 3B has one official public runtime.
// The historical Origins engine remains in the repository as a reference/backup,
// but users can no longer fall back into an older world version by navigation.
export default function WorldEntry({goTo}){
 return <Suspense fallback={<div className="world-loading">Ouverture du Monde 3B…</div>}>
  <CurrentWorld goTo={goTo}/>
 </Suspense>;
}
