import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {platformNextObjective} from '../src/world/hub/platform-layout.js';

// Compile the actual JSX rather than checking source strings or copying its logic.
const result=await build({entryPoints:[fileURLToPath(new URL('../src/world/hub/HubOrientationGuide.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',external:['react','react-dom','react-dom/*'],logLevel:'silent'});
const module={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {default:HubOrientationGuide,HubObjectiveCard,createHubObjectiveModel,updateHubOrientation,humanHubText,hubDistanceLabel,readHubOrientation,writeHubOrientation,HUB_ORIENTATION_KEY}=module.exports;
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
const button=(element,className)=>{
 const children=React.Children.toArray(element?.props?.children);
 if(element?.props?.className?.split(' ').includes(className))return element;
 for(const child of children){const found=button(child,className);if(found)return found;}
 return null;
};
const destination={id:'hub:archives',name:'Archives de la Mémoire',type:'hubBuilding',x:30,z:40};
const goal={label:'Consulte le premier témoignage',item:destination};
const snapshot={position:{x:0,z:0},route:[],waypoint:null};

test('an actual hub mission target becomes a human objective with destination and distance',()=>{
 const items=[{id:'hub:first',name:'L’accueil des voyageurs',type:'hubMission',missionId:'first_steps',objectives:['Rencontrer l’accueil des héritages'],x:0,z:50},{id:'hub:welcome',name:'Accueil des héritages',type:'hubBuilding',buildingId:'heritage_welcome',x:0,z:50}];
 const save={hub:{missions:{first_steps:{status:'active',completedObjectives:0}}}};
 const selected=platformNextObjective(items,save),model=createHubObjectiveModel(snapshot,selected,items);
 assert.equal(model.target.id,'hub:welcome');
 assert.equal(model.label,'Rencontrer l’accueil des héritages');
 assert.equal(model.destination,'Accueil des héritages');
 assert.equal(model.distanceLabel,'50 m');
 assert.equal(model.guiding,false);
 const html=render(HubObjectiveCard,{model,onNavigate:()=>{},onOpenMap:()=>{}});
 assert.match(html,/Destination : Accueil des héritages/);
 assert.match(html,/Placer un repère/);
 assert.doesNotMatch(html,/Me guider/);
});

test('a waypoint does not imply automatic walking, even while the player moves',()=>{
 const model=createHubObjectiveModel({...snapshot,waypoint:destination,moving:true},goal);
 assert.equal(model.status,'Repère choisi');
 assert.equal(model.guiding,false);
 assert.equal(model.distanceDescription,'à vol d’oiseau');
 assert.equal(model.distance,50);
});

test('automatic guidance reports the length of its real path rather than the straight line',()=>{
 const target={...destination,x:30,z:0};
 const model=createHubObjectiveModel({...snapshot,waypoint:target,route:[{x:0,z:40},{x:30,z:40},{x:30,z:0}]},goal);
 assert.equal(model.guiding,true);
 assert.equal(model.distance,110);
 assert.equal(model.distanceLabel,'110 m');
 assert.equal(model.distanceDescription,'sur ton chemin');
 const html=render(HubObjectiveCard,{model,onGuide:()=>{},onCancelGuide:()=>{},onOpenMap:()=>{}});
 assert.match(html,/Guidage en cours/);
 assert.match(html,/Arrêter le guidage et retirer le repère/);
 assert.doesNotMatch(html,/Me guider/);
});

test('initial guide, waypoint guide, and cancellation invoke their own callbacks exactly once',()=>{
 const calls=[],model=createHubObjectiveModel(snapshot,goal);
 let card=HubObjectiveCard({model,onGuideTo:item=>calls.push(['guide-to',item.id]),onNavigate:item=>calls.push(['navigate',item.id]),onOpenMap:()=>{}});
 button(card,'hub-guide-primary').props.onClick();
 card=HubObjectiveCard({model:createHubObjectiveModel({...snapshot,waypoint:destination},goal),onGuide:()=>calls.push(['guide']),onCancelGuide:()=>calls.push(['cancel']),onOpenMap:()=>{}});
 button(card,'hub-guide-primary').props.onClick();
 button(card,'hub-guide-cancel').props.onClick();
 assert.deepEqual(calls,[['guide-to',destination.id],['guide'],['cancel']]);
});

test('setting a marker remains available when direct guidance has no callback',()=>{
 const calls=[],model=createHubObjectiveModel(snapshot,goal);
 const card=HubObjectiveCard({model,onNavigate:item=>calls.push(item.id),onOpenMap:()=>{}});
 button(card,'hub-guide-primary').props.onClick();
 assert.deepEqual(calls,[destination.id]);
 const html=render(HubObjectiveCard,{model,onOpenMap:()=>{}});
 assert.doesNotMatch(html,/Placer un repère|Me guider/);
 assert.match(html,/Ouvrir la carte de la cité/);
 assert.doesNotMatch(html,/Retirer le repère/);
});

test('arrival offers interaction instead of restarting the same route',()=>{
 const model=createHubObjectiveModel({...snapshot,waypoint:destination,position:{x:29,z:39}},goal);
 assert.equal(model.arrived,true);
 assert.equal(model.status,'Tu es à proximité');
 const html=render(HubObjectiveCard,{model,onGuide:()=>{},onCancelGuide:()=>{},onOpenMap:()=>{}});
 assert.doesNotMatch(html,/Me guider/);
 assert.match(html,/Approche le lieu et choisis l’action proposée/);
 assert.match(html,/Retirer le repère/);
});

test('a freely selected marker keeps the current mission visible',()=>{
 const model=createHubObjectiveModel({...snapshot,waypoint:{id:'hub:garden',name:'Jardins de l’Unité',x:80,z:80}},goal);
 assert.equal(model.label,'Jardins de l’Unité');
 assert.equal(model.missionLabel,goal.label);
 assert.match(render(HubObjectiveCard,{model,onOpenMap:()=>{}}),/Mission : Consulte le premier témoignage/);
});

test('missing or invalid coordinates cannot produce NaN distances or an actionable route',()=>{
 const model=createHubObjectiveModel({position:{x:0,z:0},route:{bad:true}},{label:'Observe la cité',item:{name:'Un service',x:NaN,z:0}});
 assert.equal(model.canNavigate,false);
 assert.equal(model.distanceLabel,'Distance à confirmer');
 assert.doesNotMatch(render(HubObjectiveCard,{model,onGuideTo:()=>{},onNavigate:()=>{},onOpenMap:()=>{}}),/Me guider|Placer un repère|NaN/);
 assert.equal(hubDistanceLabel(-1),'Distance à confirmer');
 assert.equal(hubDistanceLabel(1250),'1,3 km');
});

test('authored machine labels stay out of objective text',()=>{
 assert.equal(humanHubText('talk:ines_varga','Parler à Inès'),'Parler à Inès');
 assert.equal(humanHubText('weather:heavy_rain','Attendre la pluie'),'Attendre la pluie');
 const model=createHubObjectiveModel(snapshot,{label:'talk:ines_varga',item:{name:'mael_rivière',x:0,z:20,district:'archives'}},[{type:'hubDistrict',district:'archives',name:'Les Archives de la Mémoire'}]);
 const html=render(HubObjectiveCard,{model,onOpenMap:()=>{}});
 assert.match(html,/Les Archives de la Mémoire/);
 assert.doesNotMatch(html,/talk:|weather:|mael_|ines_/);
});

test('orientation milestones require actions and preserve earlier completed steps',()=>{
 const initial=updateHubOrientation();
 assert.deepEqual(updateHubOrientation(initial,{type:'move',distance:1.99}),initial);
 assert.deepEqual(updateHubOrientation(initial,{type:'move',distance:NaN}),initial);
 const moved=updateHubOrientation(initial,{type:'move',distance:2});
 const map=updateHubOrientation(moved,{type:'map'});
 const complete=updateHubOrientation(map,{type:'interact'});
 assert.deepEqual(complete,{moved:true,mapOpened:true,interacted:true});
 assert.deepEqual(initial,{moved:false,mapOpened:false,interacted:false});
 assert.deepEqual(updateHubOrientation({moved:'yes',mapOpened:1,extra:true}),initial);
});

test('orientation can resume after reload and stays usable if browser storage fails',()=>{
 const rows=new Map(),storage={getItem:key=>rows.get(key),setItem:(key,value)=>rows.set(key,value)};
 writeHubOrientation({moved:true,mapOpened:false,interacted:false},false,storage);
 assert.deepEqual(readHubOrientation(storage),{seen:false,progress:{moved:true,mapOpened:false,interacted:false}});
 writeHubOrientation({moved:true,mapOpened:true,interacted:true},true,storage);
 assert.equal(readHubOrientation(storage).seen,true);
 rows.set(HUB_ORIENTATION_KEY,'broken JSON');
 assert.equal(readHubOrientation(storage).seen,false);
 const broken={getItem(){throw Error('storage unavailable');},setItem(){throw Error('storage unavailable');}};
 assert.doesNotThrow(()=>writeHubOrientation({},true,broken));
 assert.deepEqual(readHubOrientation(broken),{seen:false,progress:{moved:false,mapOpened:false,interacted:false}});
});

test('onboarding follows remapped keys and gives touch instructions on tactile devices',()=>{
 const controls={moveForward:['w'],moveLeft:['a'],moveBackward:['s'],moveRight:['d'],interact:['f']};
 const keyboard=render(HubOrientationGuide,{controls,inputMode:'keyboard',onDismiss:()=>{},onOpenMap:()=>{}});
 assert.match(keyboard,/Avance avec W/);
 assert.match(keyboard,/appuie sur F/);
 const touch=render(HubOrientationGuide,{controls,inputMode:'touch',onDismiss:()=>{},onOpenMap:()=>{}});
 assert.match(touch,/Glisse à gauche pour avancer/);
 assert.match(touch,/touche le bouton d’action/);
 assert.doesNotMatch(touch,/appuie sur F|Avance avec W/);
 const completed=render(HubOrientationGuide,{progress:{moved:true,mapOpened:true,interacted:true},onDismiss:()=>{}});
 assert.match(completed,/3 étapes accomplies sur 3/);
 assert.match(completed,/C’est parti/);
});

test('loading disables actions without losing their labels or destination',()=>{
 const model=createHubObjectiveModel(snapshot,goal),card=HubObjectiveCard({model,loaded:false,onGuideTo:()=>{},onOpenMap:()=>{}});
 assert.equal(button(card,'hub-guide-primary').props.disabled,true);
 assert.equal(button(card,'hub-guide-map').props.disabled,true);
 const html=render(HubObjectiveCard,{model,loaded:false,onGuideTo:()=>{},onOpenMap:()=>{}});
 assert.match(html,/disabled=""/);
 assert.match(html,/Consulte le premier témoignage/);
});
