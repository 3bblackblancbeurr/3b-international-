import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {applyWorldAction} from '../src/world/engine.js';
import {beginField,combatObstacles,fieldMover} from '../src/world/field-world.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {obstacleDistance} from '../src/world/collision.js';
import {HUB_PLATFORM,HUB_FINAL_POSITION} from '../src/world/hub/platform-layout.js';
import {platformObstacles,resumePlatformFinal} from '../src/world/hub/platform-physics.js';
import {startField,stepField} from '../src/world/field-combat.js';

test('final combat starts on the visible new Nexus promenade, outside the fountain',()=>{
 const save=blankSave(),marker=worldRuntimeItems('hub',save).find(i=>i.type==='final');
 const field=beginField(save,{final:true}),obstacles=combatObstacles(save);
 assert.deepEqual(field.home,HUB_FINAL_POSITION);
 assert.equal(field.home.x,marker.x);assert.equal(field.home.z,marker.z);
 for(const p of [field.p,field.enemy])assert.ok(obstacles.every(o=>obstacleDistance(p,o)>.7));
 assert.deepEqual(obstacles,platformObstacles());
});

test('final combat cannot cross the fountain or walk outside the current deck',()=>{
 const save=blankSave(),move=fieldMover(save),obstacles=combatObstacles(save);
 let p=beginField(save,{final:true}).p;
 for(let tick=0;tick<50;tick++)p=move(p,{x:0,z:-1},1.05);
 assert.ok(p.z>33,'central fountain remains solid');
 assert.ok(obstacles.every(o=>obstacleDistance(p,o)>=.69));
 p=move(p,{x:0,z:-1},5.2);
 assert.ok(p.z>33,'a dodge cannot tunnel through the fountain');
 let edge={x:0,z:HUB_PLATFORM.walkRadius-1};
 for(let i=0;i<20;i++)edge=move(edge,{x:0,z:1},1.05);
 assert.ok(Math.hypot(edge.x,edge.z)<=HUB_PLATFORM.walkRadius);
});

test('legacy final combat migrates its coordinate frame once and preserves progress',()=>{
 const source={...startField({x:2,z:6},{x:0,z:-5.4}),time:9100,guard:200,phase:'windup',windup:350};
 const migrated=resumePlatformFinal(source);
 assert.deepEqual(source.home,{x:0,z:-5.4},'input is not mutated');
 assert.deepEqual(migrated.home,HUB_FINAL_POSITION);
 assert.equal(migrated.time,source.time);assert.equal(migrated.guard,source.guard);assert.equal(migrated.windup,source.windup);
 assert.equal(migrated.phase,source.phase);
 assert.strictEqual(resumePlatformFinal(migrated),migrated,'reload must not translate a second time');
 const blocked={...source,p:{x:0,z:-16}};
 const recovered=resumePlatformFinal(blocked);
 assert.ok(platformObstacles().every(o=>obstacleDistance(recovered.p,o)>1.1),'old pose inside the new fountain is relocated');
});

test('saved finale keeps health, eight-phase mastery and gains through layout migration',()=>{
 const initial=blankSave();initial.seals=COUNTRIES.map(c=>c.id);
 for(const {id} of COUNTRIES)initial.adventure.chapters[id]={helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:3};
 let save=applyWorldAction(initial,{type:'final'});
 const e=save.adventure.encounter;e.hp=73;e.enemy=420;e.finalCircleMastery=7;e.finalCirclePhase=3;e.field=startField({x:0,z:5.6},{x:0,z:-5.4});
 const restored=normalizeSave(JSON.parse(JSON.stringify(save)));
 assert.equal(restored.adventure.encounter.hp,73);assert.equal(restored.adventure.encounter.enemy,420);
 assert.equal(restored.adventure.encounter.finalCircleMastery,7);assert.equal(restored.adventure.encounter.finalCirclePhase,3);
 assert.equal(restored.xp,save.xp);assert.equal(restored.shards,save.shards);
 assert.deepEqual(restored.adventure.encounter.field.home,HUB_FINAL_POSITION);
 assert.deepEqual(normalizeSave(restored),restored);
 const edge={x:0,z:HUB_PLATFORM.walkRadius-3};
 restored.adventure.encounter.field.p={...edge};
 const resumedAtEdge=normalizeSave(restored);
 assert.deepEqual(resumedAtEdge.adventure.encounter.field.p,edge,'resume keeps valid positions beyond the country radius');
 const stepped=stepField(resumedAtEdge.adventure.encounter,{x:0,z:0},fieldMover(resumedAtEdge));
 assert.deepEqual(stepped.field.p,edge,'combat ticks must not snap the player back to the old map limit');
});
