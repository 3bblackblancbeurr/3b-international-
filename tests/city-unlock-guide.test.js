import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {cityUnlockGuide} from '../src/world/city-unlock-guide.js';

test('City 3B guide exposes the real five-step path to the first Souvenir',()=>{
 let s=blankSave();
 let g=cityUnlockGuide(s);assert.equal(g.step,1);assert.equal(g.action,'atlas');
 s={...s,region:'france',visited:['france']};
 g=cityUnlockGuide(s);assert.equal(g.step,2);assert.match(g.title,/habitant/i);
 s={...s,adventure:{...s.adventure,chapters:{...s.adventure.chapters,france:{...s.adventure.chapters.france,helped:true,powers:['ally','ambiance']}}}};
 g=cityUnlockGuide(s);assert.equal(g.step,3);assert.match(g.detail,/2\/3/);
 s={...s,adventure:{...s.adventure,chapters:{...s.adventure.chapters,france:{...s.adventure.chapters.france,powers:['ally','ambiance','terrain']}}}};
 g=cityUnlockGuide(s);assert.equal(g.step,4);
 s={...s,adventure:{...s.adventure,chapters:{...s.adventure.chapters,france:{...s.adventure.chapters.france,solved:true}}}};
 g=cityUnlockGuide(s);assert.equal(g.step,5);assert.equal(g.target,'france:0');
 s={...s,beacons:['france:0']};
 g=cityUnlockGuide(s);assert.equal(g.unlocked,true);
});

test('City 3B guide resumes an existing country progression from the hub',()=>{
 const s=blankSave();
 s.visited=['france'];
 s.adventure.chapters.france.helped=true;
 s.adventure.chapters.france.powers=['ally'];
 const g=cityUnlockGuide(s);
 assert.equal(g.action,'travel');
 assert.equal(g.region,'france');
 assert.equal(g.step,3);
 assert.match(g.detail,/Retourne|Traverse/i);
});
