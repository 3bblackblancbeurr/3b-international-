import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/world/arsenal.js';
import {WEAPON_ART_ATLAS,weaponArtStyle,weaponDisplayName,weaponStats} from '../src/world/weapon-art.js';

test('premium weapon atlas is embedded and available to every arsenal entry',()=>{
 assert.equal(WEAPONS.length,16);
 assert.ok(WEAPON_ART_ATLAS.startsWith('data:image/webp;base64,UklGR'));
 assert.ok(WEAPON_ART_ATLAS.length>72000);
 for(const weapon of WEAPONS){
  const style=weaponArtStyle(weapon.id);
  assert.match(style.backgroundPosition,/^\d+% \d+%$/);
  assert.ok(weaponDisplayName(weapon).length>2);
 }
});

test('premium weapon UI stats stay in the ten-point display scale',()=>{
 for(const weapon of WEAPONS){
  const stats=weaponStats(weapon);
  for(const value of Object.values(stats)){
   assert.ok(Number.isInteger(value));
   assert.ok(value>=1&&value<=10);
  }
 }
});
