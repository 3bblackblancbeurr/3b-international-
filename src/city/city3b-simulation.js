import {cityBuildingKind,cityMapBlueprint,cityMapRoads,cityMapUrbanScore} from './city3b-map.js';

const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
const placedOnly=rows=>(Array.isArray(rows)?rows:[]).filter(row=>row?.placement_state!=='stored');

export function citySimulationSnapshot(snapshot={}){
  const urban=cityMapUrbanScore(snapshot);
  const definitions=new Map((snapshot.buildings||[]).map(row=>[row.code,row]));
  const placements=placedOnly(snapshot.placements);
  const counts={housing:0,commerce:0,civic:0,mobility:0,green:0,landmark:0,mixed:0};
  for(const row of placements)counts[cityBuildingKind(definitions.get(row.building_code)||row)]+=1;

  const blueprint=cityMapBlueprint(snapshot);
  const roads=cityMapRoads(blueprint);
  const level=Math.max(1,Number(snapshot.city?.city_level||1));
  const unlocked=blueprint.districts.filter(row=>row.unlocked).length;

  const housingCapacity=Math.max(60,counts.housing*220+counts.mixed*110+level*75);
  const jobs=Math.max(20,counts.commerce*95+counts.civic*60+counts.mobility*40+counts.mixed*45+level*22);
  const serviceCapacity=counts.civic*260+counts.green*95+counts.commerce*30+unlocked*35;
  const attractiveness=clamp(
    36+urban.green*.24+urban.services*.23+urban.mobility*.18+urban.balance*.19+Math.min(16,counts.landmark*4)
  );
  const occupancy=clamp(42+attractiveness*.42+urban.services*.12+urban.mobility*.08,30,98)/100;
  const residents=Math.max(25,Math.round(housingCapacity*occupancy));

  const roadCapacity=Math.max(
    180,
    360+roads.custom.length*230+counts.mobility*420+unlocked*90+roads.radials.filter(row=>row.unlocked).length*45
  );
  const trafficDemand=residents*.38+jobs*.62;
  const congestion=clamp(Math.round(trafficDemand/roadCapacity*100),0,100);
  const unemployment=clamp(Math.round(Math.max(0,residents-jobs)/Math.max(1,residents)*100),0,100);
  const services=clamp(Math.round(serviceCapacity/Math.max(1,residents)*100),0,100);
  const transit=clamp(Math.round(18+roads.custom.length*7+counts.mobility*20+unlocked*4-congestion*.14),0,100);
  const green=clamp(urban.green);
  const satisfaction=clamp(Math.round(
    38+services*.20+transit*.16+green*.16+urban.balance*.18+attractiveness*.16-congestion*.16-unemployment*.14
  ),0,100);

  const residentialDemand=clamp(Math.round(58+satisfaction*.28-Math.min(55,residents/housingCapacity*45)),0,100);
  const commercialDemand=clamp(Math.round(42+residents/18-jobs/30+transit*.12),0,100);
  const serviceDemand=clamp(Math.round(72-services*.55+residents/45),0,100);
  const growthPerCycle=Math.round((satisfaction-50)*.36+(jobs-residents)*.015);

  const status=satisfaction>=78?'Excellente':satisfaction>=62?'Solide':satisfaction>=45?'À équilibrer':'Sous pression';

  return{
    residents,
    housingCapacity,
    jobs,
    serviceCapacity,
    congestion,
    unemployment,
    services,
    transit,
    green,
    satisfaction,
    attractiveness,
    residentialDemand,
    commercialDemand,
    serviceDemand,
    growthPerCycle,
    status,
    counts,
    roadCapacity,
    trafficDemand:Math.round(trafficDemand),
    customRoads:roads.custom.length,
  };
}

export function cityTrafficRoutes(snapshot={},simulation=citySimulationSnapshot(snapshot)){
  const blueprint=cityMapBlueprint(snapshot);
  const roads=cityMapRoads(blueprint);
  const candidates=[
    ...roads.custom.map(road=>({...road,kind:'custom'})),
    ...roads.boulevards.map(road=>({...road,kind:'boulevard',width:road.width||5.2})),
    ...roads.radials.filter(road=>road.unlocked).map(road=>({...road,kind:'radial'})),
  ].filter(road=>Number.isFinite(road.x1)&&Number.isFinite(road.z1)&&Number.isFinite(road.x2)&&Number.isFinite(road.z2));

  const budget=Math.max(0,Math.min(24,Math.round((simulation.residents+simulation.jobs)/180)));
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
