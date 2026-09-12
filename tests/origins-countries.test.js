import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,countryLayout,countryDialogue,countryNextStop} from '../src/world/origins/countries.js';
import {WORLDS,SPAWNS} from '../src/world/origins/data.js';
import {blank,act,normalize} from '../src/world/origins/state.js';
import {clear,route} from '../src/world/origins/space.js';
import fs from 'node:fs';
for(const zone of Object.keys(COUNTRIES))test(zone+': travel, save, reachable residents, authored assets and return',()=>{
 const gate=WORLDS.find(w=>w.id===zone),s=blank();s.flags.awakened=true;
 assert.equal(act(s,zone,{position:{x:0,z:20}}).changed,false);
 const entered=act(s,zone,{position:gate}).save;assert.equal(entered.zone,zone);assert.equal(normalize(entered).zone,zone);
 const layout=countryLayout(zone);assert.equal(layout.buildings.length,24);
 for(let visit=0;visit<30;visit++){const stop=countryNextStop(zone,visit);assert.equal(stop.id,['resident','atelier','refuge'][visit%3]);assert.ok(clear(stop,zone));}
 for(const p of layout.points){assert.ok(clear(p,zone),p.id+' blocked');assert.ok(route(SPAWNS[zone],p,zone,{}).length,p.id+' unreachable');}
 for(const id of ['resident','atelier','refuge','walker1','walker2']){const d=countryDialogue(zone,id);assert.ok(d.text.length>40);assert.equal(d.choices.length,['atelier','refuge'].includes(id)?5:4);assert.notEqual(countryDialogue(zone,id,'history').text,countryDialogue(zone,id,'directions').text);}
 for(const level of [1,2,3])assert.ok(fs.existsSync(new URL(`../public/world/districts/${zone}-${level}-lod.glb`,import.meta.url)));
 const returned=act(entered,'country-return',{position:{x:0,z:30}});assert.equal(returned.save.zone,'sanctuary');assert.equal(returned.save.xp,s.xp);
});
