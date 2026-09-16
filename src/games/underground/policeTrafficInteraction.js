const d=(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.z||0)-(b.z||0));
export function trafficRiskAround(position,traffic=[],radius=55){const near=traffic.filter(v=>d(v.position,position)<=radius),risk=near.reduce((n,v)=>n+(v.speedKph||0)/120+.25,0);return {vehicles:near.length,risk:Math.min(1,risk/5),near};}
export function emergencyTrafficDirective(unit,traffic=[]){return traffic.filter(v=>d(v.position,unit.position)<90).map(v=>({vehicleId:v.id,action:'yield',side:v.laneSide==='left'?'left':'right',urgency:Math.min(1,.35+(unit.speedKph||0)/300)}));}
export function pursuitCollisionPolicy({trafficRisk=0,heat=1}={}){return {avoidCivilianCollision:true,overtakeMarginM:trafficRisk>.6?2.2:1.4,aggressionCap:Math.min(.82,.35+heat*.075),abortContact:trafficRisk>.7};}
