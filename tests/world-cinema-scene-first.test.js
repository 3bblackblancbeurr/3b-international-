import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_ORBIT,IMMERSIVE_ORBIT,normalizeOrbit,restoreOrbit,orbitView} from '../src/world/orbit.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('first-person-visible third-person camera is closer but retains saved player view',()=>{
 assert.equal(DEFAULT_ORBIT.distance,24,'landmark arrivals retain the wider safety view');
 assert.ok(IMMERSIVE_ORBIT.distance>=17&&IMMERSIVE_ORBIT.distance<=21,'new Hub players should see their avatar');
 assert.ok(IMMERSIVE_ORBIT.pitch>=.07&&IMMERSIVE_ORBIT.pitch<=.2,'camera reveals the street and silhouette');
 const frame=orbitView(IMMERSIVE_ORBIT,{x:0,z:0},0,false,()=>0);
 assert.ok(Math.hypot(frame.position.x-frame.target.x,frame.position.y-frame.target.y,frame.position.z-frame.target.z)<21);
 assert.match(read('src/world/scene.js'),/savedCamera\?restoreOrbit\(JSON\.parse\(savedCamera\)\):region==='hub'\?\{\.\.\.IMMERSIVE_ORBIT\}/,'the immersive view is selected only for a fresh Hub camera');
 const saved={version:2,yaw:.83,pitch:.31,distance:39};
 assert.deepEqual(restoreOrbit(saved),normalizeOrbit(saved),'do not overwrite an existing camera preference');
});

test('city HUD retains real guide, journal, map and interactions under compact mode',()=>{
 const hud=read('src/world/WorldHUD.jsx'),objective=read('src/world/hub/HubOrientationGuide.jsx');
 assert.match(hud,/hub-hud/);
 assert.match(hud,/is-roaming/);
 assert.match(hud,/onPanel\('journal'\)/);
 assert.match(hud,/onPanel\('pause'\)/);
 assert.match(hud,/onClick=\{openMap\}/);
 assert.match(hud,/closeWidget\('missions'\)/);
 assert.match(objective,/className="hub-objective-disclosure"/);
 assert.match(objective,/className="hub-objective-toggle"/);
 assert.match(objective,/className="hub-guide-primary"/);
 assert.match(objective,/onCancelGuide/);
});

test('premium mobile design uses a lightweight CSS-only overlay with a usable detail disclosure',()=>{
 const css=read('src/world/hub/cinema-hud.css');
 assert.match(css,/@media\(max-height:560px\) and \(orientation:landscape\)/);
 assert.match(css,/\.hub-objective-details\{display:none\}/);
 assert.match(css,/\.hub-objective-disclosure\{display:block/);
 assert.match(css,/\.world-minimap\.hub-minimap/);
 assert.match(css,/\.hub-evolution-chip\{display:none\}/,'landscape mode does not cover the joystick with a decorative progress card');
 assert.match(css,/backdrop-filter:none/);
 assert.match(css,/@media\(pointer:coarse\)/);
 assert.doesNotMatch(css,/https?:\/\/|@import|url\(/,'no new network or font assets');
 assert.doesNotMatch(css,/animation:\s*.*infinite/,'no heavy continuous HUD animation');
});

test('Hub entry keeps the original scenic content and does not fake progression',()=>{
 const world=read('src/world/WorldPage.jsx'),hud=read('src/world/WorldHUD.jsx'),css=read('src/world/hub/cinema-hud.css');
 assert.match(world,/createWorldScene\(canvas\.current/);
 assert.match(hud,/HubObjectiveCard model=\{hubObjective\}/);
 assert.match(hud,/hubEvolution\.restored/);
 assert.match(css,/Scene-first visual pass/);
 assert.doesNotMatch(css,/display:none.*\.play-interaction/g,'do not remove player interaction');
});
