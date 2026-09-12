import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,countryLayout,countryDialogue} from '../src/world/origins/countries.js';
import {serviceRooms} from '../src/world/origins/service-interiors.js';
import {route,clear,move} from '../src/world/origins/space.js';
import {ENCOUNTERS} from '../src/world/origins/encounters.js';
import {createCombat,stepCombat} from '../src/world/origins/combat.js';
import {normalizeAvatar} from '../src/world/avatar-rules.js';
import {avatarRecipe} from '../src/world/living.js';
test('regional services can be entered through doors, but their rear walls block movement',()=>{
 for(const zone of Object.keys(COUNTRIES))for(const r of serviceRooms(countryLayout(zone))){const front={x:r.x,z:r.z+4.5},inside={x:r.x,z:r.z};assert.ok(clear(inside,zone));assert.ok(route(front,inside,zone,{}).length);const stopped=move(inside,0,-7,zone);assert.ok(stopped.z>r.z-3.5);}
});
test('regional manifestations have bounded readable telegraphs and distinct attack rhythms',()=>{
 assert.equal(new Set(Object.values(ENCOUNTERS).map(p=>JSON.stringify([p.hp,p.speed,p.patterns]))).size,8);
 for(const zone of Object.keys(COUNTRIES)){const arena=countryLayout(zone).encounter,c=createCombat(arena,zone),player={x:arena.x,z:arena.z+2};assert.equal(c.enemy.maxHp,ENCOUNTERS[zone].hp);stepCombat(c,.016,player,Math.PI,{echo:true,echo2:true},zone);assert.equal(c.enemy.state,'windup');assert.ok(c.enemy.timer>=.9);assert.equal(c.hp,100);c.dodge=2;for(let i=0;i<35;i++)stepCombat(c,.05,player,Math.PI,{echo:true,echo2:true},zone);assert.equal(c.hp,100);}
});
test('NPC responses reflect injury, crafting and completed restoration',()=>{
 const text=(id,progress,hp=100)=>countryDialogue('maroc',id,'welcome',{avatar:{name:'Test'},hp,regions:{maroc:progress}}).text;
 assert.match(text('refuge',{},35),/blessé/);assert.match(text('atelier',{upgrade:true}),/renforcée/);assert.match(text('walker1',{restored:3}),/Test/);assert.notEqual(text('resident',{}),text('resident',{restored:1}));
});
test('independent garment colours and accessories survive normalization and reach the renderer',()=>{
 const a=normalizeAvatar({outerColor:'#af3567',metalColor:'#8899aa',pendant:true,belt:'utility',body:'femme'}),r=avatarRecipe(a);assert.equal(r.outerColor,a.outerColor);assert.equal(r.metalColor,a.metalColor);assert.equal(r.belt,'utility');assert.equal(r.pendant,true);assert.deepEqual(normalizeAvatar(a),a);assert.equal(normalizeAvatar({belt:'script',outerColor:'url(x)',pendant:'yes'}).pendant,false);
});
