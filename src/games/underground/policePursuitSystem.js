const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const HEAT_LEVELS=Object.freeze([
 {level:0,name:'Libre',units:0,roadblocks:0,heli:false,searchRadius:0,cooldown:0},
 {level:1,name:'Signal',units:2,roadblocks:0,heli:false,searchRadius:180,cooldown:12},
 {level:2,name:'Traque',units:3,roadblocks:.08,heli:false,searchRadius:260,cooldown:18},
 {level:3,name:'Pression',units:5,roadblocks:.18,heli:false,searchRadius:360,cooldown:25},
 {level:4,name:'Encerclement',units:7,roadblocks:.30,heli:false,searchRadius:480,cooldown:34},
 {level:5,name:'Tempête',units:9,roadblocks:.42,heli:true,searchRadius:620,cooldown:45},
 {level:6,name:'Blackout',units:12,roadblocks:.55,heli:true,searchRadius:800,cooldown:60},
]);
export const COUNTRY_PURSUIT_DNA=Object.freeze({
 france:{tempo:1.00,precision:1.08,density:1.05,terrain:'dense-city-fast-road'},algeria:{tempo:1.04,precision:.98,density:.90,terrain:'coast-hills-wide-road'},morocco:{tempo:1.01,precision:1.00,density:.94,terrain:'medina-edge-mountain-desert'},tunisia:{tempo:1.02,precision:.99,density:.92,terrain:'coast-old-city-open-road'},spain:{tempo:1.08,precision:1.02,density:1.00,terrain:'boulevard-mountain-coast'},italy:{tempo:1.05,precision:1.06,density:1.02,terrain:'historic-city-tunnel-coast'},turkey:{tempo:1.07,precision:1.03,density:1.04,terrain:'megacity-bridge-hills'},estonia:{tempo:.98,precision:1.09,density:.86,terrain:'old-town-forest-snow'}
});
export function createPursuitState({countryId='france',seed=1}={}){return {countryId,seed,heat:0,heatPoints:0,status:'free',contact:false,lastSeenAt:null,cooldownRemaining:0,reputation:0,escapeChain:0,damage:0,immobilized:false,arrested:false,dispatchSequence:0};}
export function heatFromPoints(points){if(points<20)return 0;if(points<60)return 1;if(points<130)return 2;if(points<230)return 3;if(points<360)return 4;if(points<520)return 5;return 6;}
export function addHeat(state,amount){const heatPoints=clamp(state.heatPoints+Math.max(0,amount),0,999),heat=heatFromPoints(heatPoints);return {...state,heatPoints,heat,status:heat?'pursuit':state.status};}
export function pursuitBudget(state){const h=HEAT_LEVELS[state.heat],dna=COUNTRY_PURSUIT_DNA[state.countryId]||COUNTRY_PURSUIT_DNA.france;return {maxUnits:Math.round(h.units*dna.density),roadblockChance:clamp(h.roadblocks*dna.precision,0,.7),helicopter:h.heli,responseTempo:dna.tempo,searchRadius:Math.round(h.searchRadius*dna.precision),terrain:dna.terrain};}
export function loseContact(state){const h=HEAT_LEVELS[state.heat];return state.heat?{...state,contact:false,status:'search',cooldownRemaining:h.cooldown}:state;}
export function tickPursuit(state,dt,{visible=false,inHideout=false,speedKph=0}={}){if(state.arrested)return state;if(visible)return {...state,contact:true,status:'pursuit',cooldownRemaining:HEAT_LEVELS[state.heat].cooldown};if(state.status!=='search')return state;const hideoutBoost=inHideout?2.2:1,speedPenalty=speedKph>120?.55:1,next=Math.max(0,state.cooldownRemaining-dt*hideoutBoost*speedPenalty);if(next>0)return {...state,cooldownRemaining:next};const reward=state.heat*120+state.escapeChain*50;return {...state,status:'escaped',heatPoints:Math.max(0,state.heatPoints-state.heat*35),heat:Math.max(0,state.heat-1),reputation:state.reputation+reward,escapeChain:state.escapeChain+1,cooldownRemaining:0};}
export function applyPursuitDamage(state,amount){const damage=clamp(state.damage+Math.max(0,amount),0,100),immobilized=damage>=100;return {...state,damage,immobilized,status:immobilized?'stopped':state.status};}
export function arrestIfStopped(state,{speedKph=0,boxedSeconds=0}={}){return state.immobilized&&speedKph<3&&boxedSeconds>=4?{...state,arrested:true,status:'arrested',heat:0,heatPoints:0,escapeChain:0}:state;}
export function fairSpawnAllowed({distanceM,lineOfSight,behindCamera,playerSpeedKph}={}){const min=playerSpeedKph>180?220:150;return distanceM>=min&&(!lineOfSight||behindCamera===true);}
