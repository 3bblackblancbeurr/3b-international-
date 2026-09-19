import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

const act=(save,action)=>applyWorldAction(save,action);
const start=(id)=>act(blankSave(),{type:'hubMissionStart',id});
const done=(save,id)=>assert.equal(save.hub.missions[id].status,'completed',id);

test('Storm Rescue completes through rescuer, mission boat and port return',()=>{
 let s=start('storm_rescue');
 s=act(s,{type:'hubNpcTalk',id:'youssef_ben_salem'});
 s=act(s,{type:'hubTransit',id:'boat:docks'});
 s=act(s,{type:'hubDistrictVisit',id:'docks'});
 done(s,'storm_rescue');
});

test('Memory Under Water completes through Kadra, boat and fog route',()=>{
 let s=start('memory_under_water');
 s=act(s,{type:'hubNpcTalk',id:'kadra_zerrouki'});
 s=act(s,{type:'hubTransit',id:'boat:docks'});
 s=act(s,{type:'hubEventDiscover',id:'dock_fog'});
 done(s,'memory_under_water');
});

test('Wagon 8 completes after conductor, train ride and panoramic train secret',()=>{
 let s=start('wagon_eight');
 s=act(s,{type:'hubNpcTalk',id:'the_conductor'});
 s=act(s,{type:'hubTransit',id:'train:docks'});
 for(const id of ['heritage_square','archives','community','gardens','city3b_portal','commerce','arena'])s=act(s,{type:'hubTransit',id:'train:'+id});
 s=act(s,{type:'hubSecretUnlock',id:'secret_train_window'});
 done(s,'wagon_eight');
});

test('Blackout, Passion and Living Fabric complete through their districts and events',()=>{
 let s=start('blue_blackout');
 s=act(s,{type:'hubNpcTalk',id:'arda_kaya'});s=act(s,{type:'hubEventDiscover',id:'power_flicker'});done(s,'blue_blackout');
 s=start('passion_trial');s=act(s,{type:'hubNpcTalk',id:'sofia_vega'});s=act(s,{type:'hubEventDiscover',id:'arena_public_challenge'});done(s,'passion_trial');
 s=start('living_fabric');s=act(s,{type:'hubNpcTalk',id:'meryem_alaoui'});s=act(s,{type:'hubDistrictVisit',id:'innovation'});done(s,'living_fabric');
});

test('Garden Listens completes only after fog event and fog-tree secret',()=>{
 let s=start('garden_listens');
 s=act(s,{type:'hubNpcTalk',id:'maarja_saar'});
 s=act(s,{type:'hubEventDiscover',id:'dock_fog'});
 s=act(s,{type:'hubSecretUnlock',id:'secret_fog_tree'});
 done(s,'garden_listens');
});

test('First Foundation uses Elio, the City portal and a final save conversation',()=>{
 let s=start('first_foundation');
 s=act(s,{type:'hubNpcTalk',id:'elio_romano'});
 s=act(s,{type:'hubDistrictVisit',id:'city3b_portal'});
 s=act(s,{type:'hubNpcTalk',id:'elio_romano'});
 done(s,'first_foundation');
});

test('Voices Square requires all three community voices in order',()=>{
 let s=start('voices_square');
 for(const id of ['amira_mansouri','lucia_navaro','soraya_najem'])s=act(s,{type:'hubNpcTalk',id});
 done(s,'voices_square');
});

test('Silent Cable requires Leyla, cable transit and cabin secret',()=>{
 let s=start('silent_cable');
 s=act(s,{type:'hubNpcTalk',id:'leyla_demir'});
 s=act(s,{type:'hubTransit',id:'telepheric:T1'});
 s=act(s,{type:'hubSecretUnlock',id:'secret_silent_cabin'});
 done(s,'silent_cable');
});

test('Three Reflections requires Nora and the rain-gated reflection secret',()=>{
 let s=start('three_reflections');
 s=act(s,{type:'hubNpcTalk',id:'nora_khelifi'});
 s=act(s,{type:'hubEventDiscover',id:'heavy_rain_echo'});
 s=act(s,{type:'hubSecretUnlock',id:'secret_rain_symbol'});
 done(s,'three_reflections');
});

test('Eight Seeds, Lost Wolf and Broken Record use their canonical NPC and district',()=>{
 let s=start('eight_seeds');s=act(s,{type:'hubNpcTalk',id:'giulia_ferri'});s=act(s,{type:'hubDistrictVisit',id:'gardens'});done(s,'eight_seeds');
 s=start('lost_wolf_signal');s=act(s,{type:'hubNpcTalk',id:'evelin_tamm'});s=act(s,{type:'hubDistrictVisit',id:'gardens'});done(s,'lost_wolf_signal');
 s=start('broken_record');s=act(s,{type:'hubNpcTalk',id:'celine_moreau'});s=act(s,{type:'hubDistrictVisit',id:'archives'});done(s,'broken_record');
});

test('Golden Pattern requires artisan, commerce and secret-market social condition',()=>{
 let s=start('golden_pattern');
 s=act(s,{type:'hubNpcTalk',id:'omar_el_fassi'});
 s=act(s,{type:'hubDistrictVisit',id:'commerce'});
 for(const id of ['mael_rivière','ines_varga','giulia_ferri','arda_kaya'])s=act(s,{type:'hubNpcTalk',id});
 s=act(s,{type:'hubSecretUnlock',id:'secret_market_code'});
 done(s,'golden_pattern');
});

test('Eight Signals progresses from Noah to the Guardian projection',()=>{
 let s=start('eight_signals');
 s=act(s,{type:'hubNpcTalk',id:'noah_leroux'});
 s=act(s,{type:'hubEventDiscover',id:'guardian_projection'});
 done(s,'eight_signals');
});
