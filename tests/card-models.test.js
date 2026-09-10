import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {CARDS} from '../src/world/catalog.js';import {CARD_DESIGNS} from '../src/world/card-designs.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../public/world/card-models/manifest.json',import.meta.url)));
test('368 source identities each resolve to a 3D asset with the appropriate type',()=>{
 assert.equal(manifest.total,368);assert.equal(new Set(manifest.cards.map(c=>c.id)).size,368);
 for(const card of CARDS){const model=manifest.cards.find(c=>c.id===card.id);assert.equal(model.kind,CARD_DESIGNS[card.id].kind);assert.ok(fs.existsSync(new URL('../public'+model.url,import.meta.url)));if(card.character)assert.ok(['Idle','Walk','Run','Attack','Hit','Death','Cast'].every(c=>model.animations.includes(c)));else assert.ok(!['person','guardian','spirit'].includes(model.kind));}
});
test('all source characters keep skin, clothing and facial surfaces independently tintable',()=>{
 for(const model of manifest.cards.filter(c=>c.kind==='person')){const b=fs.readFileSync(new URL('../public'+model.url,import.meta.url)),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(g.skins?.length,model.id);assert.ok(g.materials.some(m=>/ClothColor_ClothColor/.test(m.name)),model.id);assert.ok(g.materials.some(m=>/SkinColor/.test(m.name)),model.id);assert.ok(g.materials.some(m=>/EyeColor/.test(m.name)),model.id);}
});
