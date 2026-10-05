import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {HUB_TRANSPORT_ROUTES,validHubTransportRide} from '../src/world/hub/activity-catalog.js';
import {referenceTransportRoutes,referenceTransportRoute,referenceTransportNextStop,referenceTransportSite,referenceWaterClear,routePose,sampleTransportRide,transportRouteDuration} from '../src/world/hub/transport-motion.js';
import {createHubCartography} from '../src/world/hub/cartography-model.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_PLATFORM,HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {CITE_PROMENADES,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findInteractionPath} from '../src/world/navigation.js';
import {hubServiceConnections} from '../src/world/hub/hub-city-services.js';

const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const routes=referenceTransportRoutes();
const trips=routes.flatMap(route=>route.stops.filter(stop=>stop.boardable!==false).map(from=>({route,from,to:referenceTransportNextStop(route,from.id)})));

test('atlas, service directions and all runtime stations use the same physical transit network',()=>{
 const items=worldRuntimeItems('hub',blankSave(),{hour:12}),stations=items.filter(item=>item.type==='hubTransport'),map=createHubCartography(items);
 assert.equal(stations.length,33);assert.equal(map.transportRoutes.length,11);
 for(const station of stations){
  const route=referenceTransportRoute(station),stop=route.stops.find(stop=>stop.id===station.id),site=referenceTransportSite(station);
  near(station.x,stop.boarding.x,station.id+' longitude');near(station.z,stop.boarding.z,station.id+' latitude');
  assert.equal(station.boardable,stop.boardable!==false);assert.equal(station.routeId,route.id);assert.ok(Number.isFinite(station.transportHeading));
  near(site.travelX,stop.x,station.id+' track longitude');near(site.travelY,stop.y,station.id+' track height');
  assert.deepEqual(map.transportRoutes.find(entry=>entry.id===route.id).points,route.points);
  if(station.boardable){
   const connection=hubServiceConnections(items,{district:station.district,transport:station.transport}).find(entry=>entry.station.id===station.id);
   assert.equal(connection?.next?.id,referenceTransportNextStop(route,station.id)?.id,station.id+' service destination');
  }
 }
});

test('every playable connection exactly preserves the existing server transport contract',()=>{
 assert.equal(trips.length,27);
 for(const transport of Object.keys(HUB_TRANSPORT_ROUTES)){
  const actual=trips.filter(trip=>trip.route.transport===transport).map(({from,to})=>[from.district,to.district].join('>')).sort();
  assert.deepEqual(actual,HUB_TRANSPORT_ROUTES[transport].map(pair=>pair.join('>')).sort(),transport);
 }
 for(const {route,from,to} of trips){
  assert.ok(validHubTransportRide(route.transport,from.district,to.district));
  const save=applyWorldAction(blankSave(),{type:'hubTransportRide',transport:route.transport,from:from.district,to:to.district,night:false,dateKey:'2026-10-05'});
  assert.equal(save.hub.stats.transportRides[route.transport],1);
  assert.ok(save.hub.stats.transportStops.includes(route.transport+':'+to.district));
 }
});

test('passengers and their vehicle share positions, height, acceleration and timeline on each connection',()=>{
 for(const {route,from,to} of trips){
  const start=sampleTransportRide(route,from.id,to.id,0),finish=sampleTransportRide(route,from.id,to.id,1);
  near(start.x,from.x,from.id+' starts on vehicle');near(start.z,from.z,from.id+' starts on vehicle');near(start.y,from.y,from.id+' boarding height');
  near(finish.x,to.x,to.id+' reaches vehicle berth');near(finish.z,to.z,to.id+' reaches vehicle berth');near(finish.y,to.y,to.id+' arrival height');
  assert.ok(start.duration>0&&start.duration<45000,route.id+' remains a usable journey');
  for(const progress of [0,.001,.1,.25,.5,.8,.999,1]){
   const passenger=sampleTransportRide(route,from.id,to.id,progress),vehicle=routePose(route,passenger.routeTime);
   for(const key of ['x','y','z'])near(passenger[key],vehicle[key],`${route.id} ${progress} ${key}`);
   assert.ok(Number.isFinite(passenger.heading));
  }
 }
});

test('the express stays on the built outer arcade and uses the shorter physical arc',()=>{
 const train=routes.find(route=>route.transport==='train'),arcade=CITE_PROMENADES.find(p=>p.id==='horizon-arcade'),radius=(arcade.inner+arcade.outer)/2*HUB_SCALE;
 for(const point of train.points)near(Math.hypot(point.x,point.z),radius,'rail radius');
 for(const {route,from,to} of trips.filter(trip=>trip.route===train)){
  const initial=sampleTransportRide(route,from.id,to.id,0);assert.ok(initial.duration/1000<=Math.PI*radius/route.speed+2.001);
  for(let i=0;i<=80;i++){
   const point=sampleTransportRide(route,from.id,to.id,i/80),r=Math.hypot(point.x,point.z);
   assert.ok(r>arcade.inner*HUB_SCALE+2&&r<arcade.outer*HUB_SCALE-2,'train follows the supported arcade rather than a chord across the city');
  }
 }
});

test('boats stay at sea level outside every civic cliff while their boarding markers remain dry',()=>{
 const boat=routes.find(route=>route.transport==='boat');
 for(const stop of boat.stops){assert.ok(referenceWaterClear(stop));assert.ok(citeSurfaceDistance(stop.boarding.x/HUB_SCALE,stop.boarding.z/HUB_SCALE)<-1);}
 for(let i=0;i<=1000;i++){
  const pose=routePose(boat,transportRouteDuration(boat)*i/1000);
  assert.ok(referenceWaterClear(pose),'hull stays outside island cliffs');near(pose.y,-26.6,'sea level');
 }
 for(const {route,from,to} of trips.filter(trip=>trip.route===boat))for(let i=0;i<=100;i++)assert.ok(referenceWaterClear(sampleTransportRide(route,from.id,to.id,i/100)),'passengers follow the safe water path');
 const transfer=referenceTransportSite({id:'hub:boat:heritage_square',transport:'boat'});
 assert.equal(transfer.boardingDistrict,'docks');assert.equal(transfer.destinationDistrict,'heritage_square');assert.equal(transfer.correspondence,'promenade');
});

test('one-way lines cannot be boarded backwards or used to invent another journey',()=>{
 for(const route of routes.filter(route=>route.oneWay)){
  const [from,to]=route.stops;
  assert.equal(referenceTransportNextStop(route,to.id),null);assert.equal(referenceTransportSite({id:to.id,transport:route.transport,line:route.line}).boardable,false);
  assert.equal(sampleTransportRide(route,to.id,from.id,.5),null);
 }
 const train=routes.find(route=>route.transport==='train');
 assert.equal(sampleTransportRide(train,'missing',train.stops[0].id,.5),null);
 assert.equal(sampleTransportRide(train,train.stops[0].id,train.stops[0].id,.5),null);
 assert.equal(sampleTransportRide(train,train.stops[0].id,train.stops[3].id,.5),null);
});

test('all boarding and landing points are reachable on clear ground and the rail avoids actual buildings',()=>{
 const save=blankSave(),items=worldRuntimeItems('hub',save,{hour:12}),hub=createHubPlatform(save);
 try{
  for(const station of items.filter(item=>item.type==='hubTransport')){
   assert.ok(hub.collisions.every(o=>obstacleDistance(station,o)>=1.25),'blocked landing '+station.id);
   assert.ok(Number.isFinite(hub.height(station.x,station.z)),'finite landing ground '+station.id);
   const path=findInteractionPath(HUB_PLATFORM.spawn,station,hub.collisions,HUB_PLATFORM.walkRadius),end=path.at(-1);
   assert.ok(end&&Math.hypot(end.x-station.x,end.z-station.z)<=station.range,'unreachable boarding '+station.id);
  }
  const train=routes.find(route=>route.transport==='train');
  for(let i=0;i<train.points.length;i++){
   const a=train.points[i],b=train.points[(i+1)%train.points.length],steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.5);
   for(let k=0;k<steps;k++){
    const point={x:a.x+(b.x-a.x)*k/steps,z:a.z+(b.z-a.z)*k/steps};
    assert.ok(hub.collisions.every(o=>obstacleDistance(point,o)>=1.25),'rail intersects architecture at '+JSON.stringify(point));
   }
  }
 }finally{hub.dispose();}
});
