const finitePoint=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.z);
const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function initialPortalCrossingState(){return{latchedPortalId:null};}

// A portal stays latched until the player has fully left its (slightly wider)
// exit radius. This makes frame rate and small collision corrections irrelevant:
// one physical entry produces one transition.
export function advancePortalCrossing(state,position,portals,{entryRadius=3,exitPadding=.8}={}){
 const current=state&&typeof state==='object'?state:initialPortalCrossingState(),list=Array.isArray(portals)?portals:[];
 if(!finitePoint(position))return{state:current,entered:null};
 if(current.latchedPortalId){
  const latched=list.find(portal=>portal?.id===current.latchedPortalId&&finitePoint(portal));
  if(latched&&separation(position,latched)<=entryRadius+exitPadding)return{state:current,entered:null};
  return{state:initialPortalCrossingState(),entered:null};
 }
 let entered=null,best=Infinity;
 for(const portal of list){
  if(!portal?.id||!finitePoint(portal))continue;
  const radius=Number.isFinite(portal.physicalEntryRadius)?portal.physicalEntryRadius:entryRadius,distance=separation(position,portal);
  if(distance<=radius&&distance<best){entered=portal;best=distance;}
 }
 return entered?{state:{latchedPortalId:entered.id},entered}:{state:current,entered:null};
}
