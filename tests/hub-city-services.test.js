import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {blankHubServicePreferences,normalizeHubServicePreferences,loadHubServicePreferences,saveHubServicePreferences,hubServiceStorageKey,resolveHubCityService,hubServiceConnections,hubServiceArchive,hubServiceMissionTarget,hubPaletteAvatarPatch,HUB_ARCHIVE_RECORDS,HUB_SERVICE_VEHICLES} from '../src/world/hub/hub-city-services.js';

test('physical building services replace stubs without capturing combat, shops or unknown rooms',()=>{
 const resolve=id=>resolveHubCityService({type:'hubBuilding',buildingId:id});
 assert.equal(resolve('garage_3b'),'garage');assert.equal(resolve('shipyard_3b'),'dock');assert.equal(resolve('central_marina'),'dock');assert.equal(resolve('train_station'),'rail');
 assert.equal(resolve('ai_textile_lab'),'atelier');assert.equal(resolve('mode3_studio'),'atelier');assert.equal(resolve('memory_archives'),'archives');assert.equal(resolve('living_cards_gallery'),'archives');
 assert.equal(resolve('city_planning_office'),'urbanism');assert.equal(resolve('city_gallery'),'urbanism');
 for(const id of ['arena_3b','mobility_center','house_3b','community_house','workers_memorial','unknown'])assert.equal(resolve(id),null);
 assert.equal(resolveHubCityService({type:'portal',buildingId:'garage_3b'}),null);assert.equal(resolveHubCityService(null),null);
});

test('versioned preferences retain valid local choices and discard arbitrary inventory or reward fields',()=>{
 const result=normalizeHubServicePreferences({version:1,xp:999999,coins:999999,favorites:['circle','circle','unknown',{}],vehicle:{id:'express',finish:'matrix',purpose:'secours',checks:[0,0,3,4,-1,'2']},atelier:{material:'metal',base:'#ABCDEf',accent:'javascript:alert(1)',pattern:'insigne'}});
 assert.deepEqual(result.favorites,['circle']);assert.deepEqual(result.vehicle,{id:'express',finish:'matrix',purpose:'secours',checks:[0,3]});
 assert.deepEqual(result.atelier,{material:'metal',base:'#abcdef',accent:'#e8b84d',pattern:'insigne'});assert.equal(result.xp,undefined);assert.equal(result.coins,undefined);
 assert.deepEqual(normalizeHubServicePreferences({version:42,favorites:['circle']}),blankHubServicePreferences());
 assert.deepEqual(normalizeHubServicePreferences(null),blankHubServicePreferences());
});

test('service preference persistence is isolated by account and reports write failures',()=>{
 const rows=new Map(),storage={getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value)};
 const draft=blankHubServicePreferences();draft.favorites=['workers'];draft.vehicle.id='cabine';
 assert.equal(saveHubServicePreferences(draft,'alice',storage).ok,true);assert.deepEqual(loadHubServicePreferences('alice',storage),draft);
 assert.deepEqual(loadHubServicePreferences('bob',storage),blankHubServicePreferences());assert.deepEqual(loadHubServicePreferences(null,storage),blankHubServicePreferences());
 assert.notEqual(hubServiceStorageKey('alice'),hubServiceStorageKey('bob'));assert.notEqual(hubServiceStorageKey('alice'),hubServiceStorageKey(null));
 assert.equal(saveHubServicePreferences(draft,'alice',{setItem(){throw Error('quota');}}).ok,false);
 assert.deepEqual(loadHubServicePreferences('alice',{getItem(){throw Error('unavailable');}}),blankHubServicePreferences());
 assert.deepEqual(loadHubServicePreferences('alice',{getItem:()=>'{bad json'}),blankHubServicePreferences());
 assert.equal(saveHubServicePreferences(draft,'alice',null).ok,false);
});

test('atelier applies only colors and a supported existing avatar pattern',()=>{
 assert.deepEqual(hubPaletteAvatarPatch({material:'metal',base:'#abcdef',accent:'#102030',pattern:'damier',weaponTier:4,xp:90000}),{fabricColor:'#abcdef',accentColor:'#102030',pattern:'damier'});
 assert.deepEqual(hubPaletteAvatarPatch({base:'red',accent:'#fff',pattern:'unknown'}),{fabricColor:'#101a26',accentColor:'#e8b84d',pattern:'broderie'});
});

test('transport planner uses only real runtime boarding markers and the next station on each line',()=>{
 const train=(id,district,index,x)=>({id,type:'hubTransport',transport:'train',line:'3B Express',district,stopIndex:index,x,z:1});
 const items=[train('b','community',1,2),train('a','docks',0,1),train('c','gardens',2,3),{id:'decorative-quay',type:'hubTransport',transport:'boat',district:'docks',boardable:false,x:4,z:5},{id:'invalid',type:'hubTransport',transport:'train',district:'docks',x:NaN,z:0}];
 const routes=hubServiceConnections(items,{district:'docks',transport:'train'});assert.equal(routes.length,1);assert.equal(routes[0].station.id,'a');assert.equal(routes[0].next.id,'b');assert.deepEqual(routes[0].stops.map(row=>row.id),['a','b','c']);
 const last=hubServiceConnections(items,{district:'gardens',transport:'train'});assert.equal(last[0].next.id,'a');
 assert.deepEqual(hubServiceConnections(items,{district:'docks',transport:'boat'}),[]);
 assert.deepEqual(hubServiceConnections([]),[]);
});

test('one-way tyroliennes expose their landing station without treating it as a boarding point',()=>{
 const items=[{id:'start',type:'hubTransport',transport:'zipline',line:'Z1',district:'docks',stopIndex:0,x:0,z:0,boardable:true},{id:'landing',type:'hubTransport',transport:'zipline',line:'Z1',district:'arena',stopIndex:1,x:10,z:10,boardable:false}];
 assert.equal(hubServiceConnections(items,{district:'docks'})[0].next.id,'landing');assert.deepEqual(hubServiceConnections(items,{district:'arena'}),[]);
});

test('Archives show saved mission completion and visited places without awarding or mutating progress',()=>{
 const save=blankSave(),before=JSON.stringify(save);let records=hubServiceArchive(save);
 assert.equal(records.length,HUB_ARCHIVE_RECORDS.length);assert.equal(records.find(row=>row.id==='arrival').visited,false);assert.equal(JSON.stringify(save),before);
 save.hub.stats.buildingVisits=['heritage_welcome'];save.hub.missions.first_steps={...save.hub.missions.first_steps,status:'completed',claimed:true,completedObjectives:3};
 records=hubServiceArchive(save);const arrival=records.find(row=>row.id==='arrival');assert.equal(arrival.visited,true);assert.equal(arrival.missions.find(row=>row.id==='first_steps').claimed,true);
 for(const row of records)for(const mission of row.missions)assert.ok(save.hub.missions[mission.id]);
 assert.equal(save.xp,0);assert.equal(HUB_SERVICE_VEHICLES.length,3);
});

test('mission wayfinding selects a live objective before the offer and returns no invented target',()=>{
 const offer={id:'offer',type:'hubMission',missionId:'first_echo'},action={id:'action',type:'hubMissionAction',missionId:'first_echo'};
 assert.equal(hubServiceMissionTarget([offer,action],'first_echo'),action);assert.equal(hubServiceMissionTarget([offer],'first_echo'),offer);assert.equal(hubServiceMissionTarget([offer],'unknown'),null);
});
