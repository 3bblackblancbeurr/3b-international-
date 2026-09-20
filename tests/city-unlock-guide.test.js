import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
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
 const initial=blankSave();
 // Chapters are created lazily: normalize an actual persisted chapter instead
 // of mutating an undefined chapter in a brand-new save.
 const s=normalizeSave({...initial,visited:['france'],adventure:{...initial.adventure,chapters:{france:{helped:true,powers:['ally']}}}});
 const before=structuredClone(s);
 const g=cityUnlockGuide(s);
 assert.equal(g.action,'travel');
 assert.equal(g.region,'france');
 assert.equal(g.step,3);
 assert.match(g.detail,/Retourne|Traverse/i);
 assert.deepEqual(s,before,'Displaying the guide must not change saved progression');
});

test('City 3B guide tolerates a visited country without an initialized chapter',()=>{
 const s=normalizeSave({...blankSave(),visited:['france']});
 const g=cityUnlockGuide(s);
 assert.equal(g.unlocked,false);
 assert.equal(g.action,'travel');
 assert.equal(g.region,'france');
 assert.equal(g.step,2);
 assert.match(g.nextTitle,/habitant/i);
 assert.equal(s.adventure.chapters.france,undefined);
});

test('City 3B guide resumes the most advanced visited country without inventing a Souvenir',()=>{
 const initial=blankSave();
 const s=normalizeSave({...initial,visited:['france','maroc'],adventure:{...initial.adventure,chapters:{france:{helped:true,powers:['ally']},maroc:{helped:true,powers:['ally','ambiance','terrain'],solved:true}}}});
 const g=cityUnlockGuide(s);
 assert.equal(g.unlocked,false);
 assert.equal(g.action,'travel');
 assert.equal(g.region,'maroc');
 assert.equal(g.step,5);
 assert.deepEqual(s.beacons,[]);
});
