import test from 'node:test';import assert from 'node:assert/strict';
import {blank,act,normalize} from '../src/world/origins/state.js';
import {COUNTRIES,countryLayout} from '../src/world/origins/countries.js';
import {createCombat,command,stepCombat} from '../src/world/origins/combat.js';
for(const zone of Object.keys(COUNTRIES))test(zone+': gathering, crafting, reconstruction, resting and repeatable victories',()=>{
 let s=blank();s.zone=zone;const p=id=>countryLayout(zone).points.find(p=>p.id===id);
 const run=(id,extra={})=>{const r=act(s,id,{position:p(id),...extra});s=r.save;return r;};
 assert.equal(act(s,'country-garden',{position:{x:90,z:40}}).changed,false);
 run('country-garden');assert.equal(s.regions[zone].supplies,3);run('country-garden');assert.equal(s.regions[zone].supplies,3);
 run('atelier',{topic:'upgrade'});assert.equal(s.regions[zone].supplies,1);assert.equal(s.regions[zone].upgrade,true);const xp=s.xp;run('atelier',{topic:'upgrade'});assert.equal(s.xp,xp);
 run('country-garden',{topic:'restore'});assert.equal(s.regions[zone].restored,0);
 run('country-encounter',{combatVictory:true});assert.equal(s.regions[zone].supplies,3);assert.equal(s.regions[zone].gathered,false);
 run('country-garden',{topic:'restore'});assert.equal(s.regions[zone].restored,1);assert.equal(s.regions[zone].supplies,0);
 s.hp=12;run('refuge',{topic:'rest'});assert.equal(s.hp,100);assert.equal(normalize(s).xp,s.xp);assert.deepEqual(normalize(s).regions,s.regions);
 const c=createCombat(countryLayout(zone).encounter);command(c,'circle',c.enemy);for(let i=0;i<600;i++)stepCombat(c,1/60,c.enemy,0,{},zone);assert.ok(c.energy>39,'energy must regenerate outside France');assert.equal(c.attack,null);
});
