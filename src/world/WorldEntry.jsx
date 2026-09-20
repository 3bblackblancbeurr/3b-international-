import React,{Suspense,lazy,useState} from 'react';
const CurrentWorld=lazy(()=>import('./WorldPage.jsx'));
const Origins=lazy(()=>import('./origins/OriginsPage.jsx'));
// The two engines keep their own account-scoped saves. Never reset or silently migrate them.
export default function WorldEntry({goTo}){
 const [legacy,setLegacy]=useState(false);
 const navigate=id=>{if(id==='world-origins'){setLegacy(true);return;}if(id==='monde-3b'){setLegacy(false);return;}goTo(id);};
 return <Suspense fallback={<div className="world-loading">Ouverture du Monde 3B…</div>}>
  {legacy?<Origins goTo={navigate} onPrevious={()=>setLegacy(false)}/>:<CurrentWorld goTo={navigate}/>}
 </Suspense>;
}
