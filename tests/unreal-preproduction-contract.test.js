import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readJson=url=>JSON.parse(readFileSync(new URL(url,import.meta.url),'utf8'));
const readText=url=>readFileSync(new URL(url,import.meta.url),'utf8');

const pairs=[
 ['../src/world/hub/data/hub-master-plan-v2.json','../unreal/3BWorld/Data/Canonical/hub-master-plan-v2.json'],
 ['../src/world/hub/data/npcs-v1.json','../unreal/3BWorld/Data/Canonical/npcs-v1.json'],
 ['../src/world/hub/data/missions-v1.json','../unreal/3BWorld/Data/Canonical/missions-v1.json'],
 ['../src/world/hub/data/events-v1.json','../unreal/3BWorld/Data/Canonical/events-v1.json'],
 ['../src/world/hub/data/secrets-v1.json','../unreal/3BWorld/Data/Canonical/secrets-v1.json'],
];

test('Unreal canonical mirrors stay byte-equivalent at the JSON data level',()=>{
 for(const [web,unreal] of pairs)assert.deepEqual(readJson(web),readJson(unreal),unreal);
});

test('Unreal preproduction keeps the complete Cité canon',()=>{
 const plan=readJson('../unreal/3BWorld/Data/Canonical/hub-master-plan-v2.json');
 const npcs=readJson('../unreal/3BWorld/Data/Canonical/npcs-v1.json');
 const missions=readJson('../unreal/3BWorld/Data/Canonical/missions-v1.json');
 const events=readJson('../unreal/3BWorld/Data/Canonical/events-v1.json');
 const secrets=readJson('../unreal/3BWorld/Data/Canonical/secrets-v1.json');
 assert.equal(plan.districts.length,10);
 assert.equal(plan.buildings.length,19);
 assert.equal(plan.countries.length,8);
 assert.equal(npcs.length,24);
 assert.equal(missions.length,20);
 assert.equal(events.length,10);
 assert.equal(secrets.length,16);
});

test('Unreal project is explicitly parallel and targets UE 5.8',()=>{
 const project=readJson('../unreal/3BWorld/3BWorld.uproject');
 const readme=readText('../unreal/3BWorld/README.md');
 assert.equal(project.EngineAssociation,'5.8');
 assert.equal(project.Modules[0].Name,'ThreeBWorld');
 assert.match(readme,/Three\.js reste la référence fonctionnelle/);
 assert.match(readme,/aucun secret Supabase/i);
});

test('Unreal C++ contract keeps private backend credentials out of the client',()=>{
 const contract=readText('../unreal/3BWorld/Source/ThreeBWorld/Public/ThreeBBackendContract.h');
 assert.match(contract,/WorldEnginePath/);
 assert.match(contract,/City3BPath/);
 assert.doesNotMatch(contract,/service_role\s*=/i);
 assert.doesNotMatch(contract,/SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test('backend JSON schemas preserve account and City ownership boundaries',()=>{
 const passport=readJson('../unreal/3BWorld/Data/Contracts/passport.schema.json');
 const city=readJson('../unreal/3BWorld/Data/Contracts/city3b.schema.json');
 const world=readJson('../unreal/3BWorld/Data/Contracts/world-state.schema.json');
 assert.ok(passport.required.includes('user_id'));
 assert.ok(passport.required.includes('country'));
 assert.equal(city.properties.placements.items.properties.rotation.enum.length,4);
 assert.equal(world.properties.version.const,1);
});
