import test from 'node:test';
import assert from 'node:assert/strict';
import { NEXUS_WORLDS, resolveNexusWorld, nexusGatePosition, nexusPixelRatio, rememberNexusCountry } from '../src/components/nexus-worlds.js';

test('the eight countries retain their established guardians and values', () => {
  assert.equal(NEXUS_WORLDS.length, 8);
  assert.equal(new Set(NEXUS_WORLDS.map(w => w.code)).size, 8);
  assert.deepEqual(NEXUS_WORLDS.map(w => [w.code, w.guardian, w.value]), [
    ['FR','Céliane','Justice'],['DZ','Yliane','Loyauté'],['ES','Diego','Passion'],['MA','Naël','Noblesse'],
    ['IT','Alessio','Espoir'],['TN','Soraya','Courage'],['TR','Émir','Foi'],['EE','Eira','Sagesse'],
  ]);
  for (const w of NEXUS_WORLDS) { assert.match(w.color, /^#[0-9a-f]{6}$/i); assert.ok(w.description.length > 30); }
});
test('unknown doors and ORIGINE never resolve to an unlocked country', () => {
  for (const code of [null, undefined, '', 'ORIGIN', 'ORIGINE', '__proto__', '<script>']) assert.equal(resolveNexusWorld(code), null);
  assert.equal(resolveNexusWorld('FR').country, 'France');
});
test('the eight architectural gates are distinct, symmetric and in the same arc', () => {
  const positions=NEXUS_WORLDS.map((_,i)=>nexusGatePosition(i));
  for(let i=0;i<8;i++){
    const p=positions[i];assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
    assert.ok(Math.abs(Math.hypot(p.x,p.z-3)-17)<1e-8);
    assert.ok(Math.abs(p.x+positions[7-i].x)<1e-8);
    if(i)assert.ok(p.x>positions[i-1].x);
  }
  assert.deepEqual(nexusGatePosition(-99),positions[0]); assert.deepEqual(nexusGatePosition(99),positions[7]);
});
test('rendering budgets cap mobile DPR and support an explicit economy setting', () => {
  assert.equal(nexusPixelRatio(390,4),1.35);assert.equal(nexusPixelRatio(1440,4),1.75);
  assert.equal(nexusPixelRatio(390,4,'light'),1);assert.equal(nexusPixelRatio(1440,4,'light'),1);
  assert.equal(nexusPixelRatio(390,NaN),1);assert.equal(nexusPixelRatio(390,.3),1);
});
test('the country handoff writes only the established navigation key', () => {
  const writes=[];const storage={setItem:(...args)=>writes.push(args)};
  assert.equal(rememberNexusCountry(storage,'FR'),true);assert.deepEqual(writes,[['3b:nexus-country','FR']]);
  assert.equal(rememberNexusCountry(storage,'ORIGIN'),false);assert.equal(writes.length,1);
});
test('private mode does not throw or prevent leaving the Nexus', () => {
  assert.equal(rememberNexusCountry({setItem(){throw new Error('blocked');}},'DZ'),false);
  assert.equal(rememberNexusCountry(null,'FR'),false);
});
