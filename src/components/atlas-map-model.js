// Illustrated geographic routes, not operational hubs or verified locations.
// Pin positions are percentages of the shared 1000 × 500 map viewport.
export const ATLAS_PORTALS=Object.freeze([
 {id:'americas',x:20,y:36,label:'Amériques',action:'travel',gold:false},
 {id:'south-america',x:25,y:65,label:'Amérique du Sud',action:'travel',gold:false},
 {id:'europe',x:52,y:26,label:'Europe et les huit héritages',action:'france',gold:true},
 {id:'africa',x:48,y:44,label:'Afrique du Nord',action:'maroc',gold:true},
 {id:'asia',x:78,y:32,label:'Asie',action:'travel',gold:false},
 {id:'oceania',x:87,y:76,label:'Océanie',action:'travel',gold:false},
].map(Object.freeze));

const REALM_PORTALS=Object.freeze({
 france:'europe',espagne:'europe',italie:'europe',turquie:'europe',estonie:'europe',
 algerie:'africa',maroc:'africa',tunisie:'africa',
});

export function atlasPortalForRealm(realm){
 return Object.hasOwn(REALM_PORTALS,realm)?REALM_PORTALS[realm]:null;
}

export function atlasPoint(portalId){
 const portal=ATLAS_PORTALS.find(item=>item.id===portalId);
 return portal?{x:portal.x*10,y:portal.y*5}:null;
}

function routeGeometry(from,to){
 const start=atlasPoint(from),end=atlasPoint(to);
 const lift=Math.max(32,Math.min(120,Math.abs(end.x-start.x)*.24+Math.abs(end.y-start.y)*.12));
 const control={x:(start.x+end.x)/2,y:Math.max(20,(start.y+end.y)/2-lift)};
 const path=(a,b)=>`M${a.x} ${a.y} Q${control.x} ${Number(control.y.toFixed(2))} ${b.x} ${b.y}`;
 return {path:path(start,end),reversePath:path(end,start)};
}

export function atlasConnections(activeRealm){
 const selected=atlasPortalForRealm(activeRealm);
 return ATLAS_PORTALS.filter(portal=>portal.id!=='europe').map(portal=>{
  const from='europe',to=portal.id;
  const {path,reversePath}=routeGeometry(from,to);
  // Europe is the network anchor. Its active journey comes from Africa;
  // selecting an African realm reverses that same route, without a second base.
  const active=to==='africa'&&(selected==='europe'||selected==='africa');
  return {
   id:`${from}-${to}`,from,to,path,
   color:portal.gold||to==='americas'||to==='asia'?'warm':'cold',
   active,
   activePath:active?(selected==='europe'?reversePath:path):null,
  };
 });
}
