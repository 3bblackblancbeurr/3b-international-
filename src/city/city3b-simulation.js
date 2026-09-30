import {cityBuildingKind,cityMapBlueprint,cityMapRoads,cityMapUrbanScore} from './city3b-map.js';

const clamp=(value,min=0,max=100)=>Math.round(Math.min(max,Math.max(min,Number(value)||0)));
const placedOnly=rows=>(Array.isArray(rows)?rows:[]).filter(row=>row?.placement_state!=='stored');

export function citySimulationSnapshot(snapshot={}){
 const life=snapshot.life,available=life?.available===true;
 const residents=available?Math.max(0,Number(life.population)||0):0;
 const need=code=>(Array.isArray(life?.needs)?life.needs:[]).find(n=>n.code===code)?.score||0;
 const jobs=available?Math.max(0,Number(life.jobs)||0):0,working=available?Math.max(0,Number(life.workingPopulation)||0):0,employed=available?Math.max(0,Number(life.employed)||0):0;
 const satisfaction=available?clamp(life.happiness):0;
 return {available,residents,housingCapacity:available?Number(life.housingCapacity)||0:0,jobs,employed,workingPopulation:working,
  congestion:available?clamp(100-Number(life.mobility||0)):0,unemployment:working?Math.round((working-employed)/working*100):0,
  services:available?Math.round(['water','energy','food','health','education'].reduce((sum,code)=>sum+need(code),0)/5):0,
  transit:available?clamp(life.mobility):0,green:available?clamp(need('green')):0,satisfaction,attractiveness:satisfaction,
  residentialDemand:available?clamp(residents/Math.max(1,Number(life.housingCapacity)||0)*100):0,
  commercialDemand:working?clamp((working-employed)/working*100):0,serviceDemand:available?clamp(100-satisfaction):0,
  growthPerCycle:available&&residents<Number(life.housingCapacity)?Math.max(1,Math.min(12,Math.ceil(Number(life.housingCapacity)*.08)+(life.policy==='industry'?1:0))):0,
  status:!available?'Indisponible':satisfaction>=78?'Excellente':satisfaction>=62?'Solide':satisfaction>=45?'À équilibrer':'À développer',
  customRoads:available?Number(life.roads)||0:0,trafficDemand:employed,counts:cityMapUrbanScore(snapshot).counts};
}

export function cityTrafficRoutes(snapshot={},simulation=citySimulationSnapshot(snapshot)){
  const blueprint=cityMapBlueprint(snapshot);
  const roads=cityMapRoads(blueprint);
  const candidates=[
    ...roads.custom.map(road=>({...road,kind:'custom'})),
    ...roads.boulevards.map(road=>({...road,kind:'boulevard',width:road.width||5.2})),
    ...roads.radials.filter(road=>road.unlocked).map(road=>({...road,kind:'radial'})),
  ].filter(road=>Number.isFinite(road.x1)&&Number.isFinite(road.z1)&&Number.isFinite(road.x2)&&Number.isFinite(road.z2));

  const budget=Math.max(0,Math.min(24,Math.round((simulation.residents+Number(simulation.employed||0))/8)));
  if(!budget||!candidates.length)return[];

  const result=[];
  for(let index=0;index<budget;index++){
    const road=candidates[index%candidates.length];
    const reverse=index%3===2;
    const speed=Math.max(5,Math.min(18,12-simulation.congestion*.055+(index%5)));
    result.push({
      id:'traffic-'+index,
      x1:reverse?road.x2:road.x1,
      z1:reverse?road.z2:road.z1,
      x2:reverse?road.x1:road.x2,
      z2:reverse?road.z1:road.z2,
      duration:Number((18-speed*.55+(index%4)*.8).toFixed(1)),
      delay:Number((index*.47%4).toFixed(2)),
      size:road.kind==='boulevard'?1.15:.9,
    });
  }
  return result;
}
