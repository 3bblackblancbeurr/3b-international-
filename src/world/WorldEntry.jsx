import React,{Suspense,lazy,useState} from 'react';
const Origins=lazy(()=>import('./origins/OriginsPage.jsx'));
const Previous=lazy(()=>import('./WorldPage.jsx'));
// One application entry; previous world and its saves remain available for rollback.
export default function WorldEntry({goTo}){const [previous,setPrevious]=useState(false);return <Suspense fallback={<div className="world-loading">Ouverture du Monde 3B…</div>}>{previous?<Previous goTo={id=>id==='monde-3b'?setPrevious(false):goTo(id)}/>:<Origins goTo={goTo} onPrevious={()=>setPrevious(true)}/>}</Suspense>;}
