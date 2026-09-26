import test from 'node:test';
import assert from 'node:assert/strict';
import {
 REALM_GOLD_MASTER,
 REALM_GOLD_MASTER_REQUIREMENTS,
 REALM_RELEASE_ORDER,
 realmReleaseChecklist,
 realmCanShip,
} from '../src/world/realm-gold-master.js';

test('France is the only reference Gold Master and seven realms inherit its release contract',()=>{
 assert.equal(REALM_RELEASE_ORDER.length,8);
 assert.equal(REALM_GOLD_MASTER.france.reference,true);
 for(const region of REALM_RELEASE_ORDER.slice(1)){
  assert.equal(REALM_GOLD_MASTER[region].reference,false);
  assert.equal(REALM_GOLD_MASTER[region].inheritsFrom,'france');
  assert.deepEqual(REALM_GOLD_MASTER[region].required,REALM_GOLD_MASTER_REQUIREMENTS);
 }
});

test('canonical guardians and values remain attached to every realm release contract',()=>{
 assert.deepEqual(
  Object.fromEntries(REALM_RELEASE_ORDER.map(region=>[
   region,
   [REALM_GOLD_MASTER[region].guardian,REALM_GOLD_MASTER[region].value]
  ])),
  {
   france:['Céliane','Justice'],
   algerie:['Yliane','Loyauté'],
   espagne:['Diego','Passion'],
   maroc:['Naël','Noblesse'],
   italie:['Alessio','Espoir'],
   tunisie:['Soraya','Courage'],
   turquie:['Émir','Foi'],
   estonie:['Eira','Sagesse'],
  }
 );
});

test('a realm cannot be declared Gold Master with even one required gate missing',()=>{
 const almost=REALM_GOLD_MASTER_REQUIREMENTS.slice(0,-1);
 assert.equal(realmCanShip('france',almost),false);
 const check=realmReleaseChecklist('france',almost);
 assert.deepEqual(check.missing,[REALM_GOLD_MASTER_REQUIREMENTS.at(-1)]);
 assert.equal(realmCanShip('france',REALM_GOLD_MASTER_REQUIREMENTS),true);
});
