import test from 'node:test';
import assert from 'node:assert/strict';
import {VISUAL_COUNTS,VISUAL_FAMILIES,VISUAL_RATIOS,makeVisualBrief} from '../src/ai/visual-director-catalog.js';

test('creative director uses eight meaningful visual families with unique presets',()=>{
 assert.equal(VISUAL_FAMILIES.length,8);
 assert.ok(VISUAL_COUNTS>=55,'at least 55 grounded visual directions');
 assert.equal(new Set(VISUAL_FAMILIES.map(x=>x.id)).size,8);
 assert.equal(new Set(VISUAL_RATIOS.map(x=>x.id)).size,3);
 for(const group of VISUAL_FAMILIES){
  assert.ok(group.presets.length>=6,group.id);
  assert.equal(new Set(group.presets.map(x=>x[0])).size,group.presets.length);
  assert.ok(group.presets.every(x=>x.length===3&&x.every(s=>typeof s==='string'&&s.length>3)));
 }
});
test('personalized briefs preserve selected scene, format and truthful limitations',()=>{
 const text=makeVisualBrief({family:'games',preset:'skilltree',subject:'Kaïs / 3B World',ratio:'wide',notes:'Arbre français'});
 assert.match(text,/Arbre de compétences/);
 assert.match(text,/16:9/);
 assert.match(text,/Kaïs \/ 3B World/);
 assert.match(text,/sans promesse|ne pas inventer/i);
 assert.match(text,/aucun rendu IA n’est lancé automatiquement/i);
 assert.doesNotMatch(text,/api[_-]?key|Bearer /);
});
test('untrusted long text is bounded and controls sanitized',()=>{
 const text=makeVisualBrief({family:'world',preset:'mapworld',subject:'a'.repeat(5000)+'\n',ratio:'mobile',notes:'b'.repeat(700)});
 assert.ok(text.length<3000);
 assert.doesNotMatch(text,/\n[\u0000-\u001f]/);
});
