import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = join(here, '..', 'src', 'world', 'hub', 'data');
const read = (name) => JSON.parse(readFileSync(join(dataRoot, name), 'utf8'));
const plan = read('hub-master-plan-v2.json');
const npcs = read('npcs-v1.json');
const missions = read('missions-v1.json');
const events = read('events-v1.json');
const secrets = read('secrets-v1.json');
const unique = (rows, key = 'id') => new Set(rows.map((row) => row[key])).size === rows.length;

test('Hub V2 preserves eight countries, guardians and canonical values', () => {
  assert.equal(plan.countries.length, 8);
  assert.ok(unique(plan.countries, 'code'));
  assert.ok(unique(plan.countries, 'guardian'));
  assert.ok(unique(plan.countries, 'value'));
  assert.deepEqual(
    Object.fromEntries(plan.countries.map(({ code, guardian, value }) => [code, { guardian, value }])),
    {
      FR: { guardian: 'Céliane', value: 'Justice' },
      DZ: { guardian: 'Yliane', value: 'Loyauté' },
      MA: { guardian: 'Naël', value: 'Noblesse' },
      TN: { guardian: 'Soraya', value: 'Courage' },
      ES: { guardian: 'Diego', value: 'Passion' },
      IT: { guardian: 'Alessio', value: 'Espoir' },
      TR: { guardian: 'Émir', value: 'Foi' },
      EE: { guardian: 'Eira', value: 'Sagesse' },
    },
  );
});

test('Hub V2 districts, buildings and transport references are consistent', () => {
  assert.equal(plan.districts.length, 10);
  assert.ok(unique(plan.districts));
  assert.ok(unique(plan.buildings));
  const districtIds = new Set(plan.districts.map(({ id }) => id));
  for (const building of plan.buildings) assert.ok(districtIds.has(building.district), building.id);
  for (const station of plan.transport.train.stations) assert.ok(districtIds.has(station), station);
  for (const stop of plan.transport.boats.stops) assert.ok(districtIds.has(stop), stop);
  for (const line of [...plan.transport.telepherics.lines, ...plan.transport.ziplines.lines]) {
    assert.ok(districtIds.has(line.from), `${line.id}:from`);
    assert.ok(districtIds.has(line.to), `${line.id}:to`);
  }
  assert.equal(plan.transport.train.stations.length, 10);
  assert.equal(plan.transport.telepherics.lines.length, 3);
  assert.equal(plan.transport.ziplines.lines.length, 6);
});

test('First living-world pack has valid NPC, mission, event and secret links', () => {
  assert.ok(unique(npcs));
  assert.ok(unique(missions));
  assert.ok(unique(events));
  assert.ok(unique(secrets));
  assert.ok(npcs.length >= 20);
  assert.ok(missions.length >= 12);
  assert.ok(events.length >= 6);
  assert.ok(secrets.length >= 12);
  const districtIds = new Set(plan.districts.map(({ id }) => id));
  const npcIds = new Set(npcs.map(({ id }) => id));
  const missionIds = new Set(missions.map(({ id }) => id));
  for (const npc of npcs) {
    assert.ok(districtIds.has(npc.district), npc.id);
    for (const missionId of npc.missionIds) assert.ok(missionIds.has(missionId), `${npc.id}:${missionId}`);
  }
  for (const mission of missions) {
    assert.ok(districtIds.has(mission.district), mission.id);
    assert.ok(npcIds.has(mission.giver), `${mission.id}:${mission.giver}`);
  }
  for (const event of events) assert.ok(districtIds.has(event.district), event.id);
  for (const secret of secrets) assert.ok(districtIds.has(secret.district), secret.id);
});

test('First playable slice remains scoped, useful and measurable', () => {
  assert.deepEqual(plan.firstPlayableSlice.gates, ['FR', 'DZ']);
  assert.ok(plan.firstPlayableSlice.targetMinutes[0] >= 10);
  assert.ok(plan.firstPlayableSlice.targetMinutes[1] <= 30);
  assert.ok(plan.performance.mobileMedium.targetFps >= 30);
  assert.ok(plan.performance.mobileHigh.targetFps >= 60);
  assert.ok(plan.firstPlayableSlice.transports.includes('train'));
  assert.ok(plan.firstPlayableSlice.transports.includes('boats'));
});


test('Hub V3 canon defines eight dispersed heritage esplanades and vertical links',()=>{
  assert.equal(plan.heritagePlatforms.length,8);
  assert.ok(unique(plan.heritagePlatforms,'code'));
  assert.ok(unique(plan.heritagePlatforms,'regionId'));
  assert.deepEqual(plan.heritagePlatforms.map(row=>row.code).sort(),['DZ','EE','ES','FR','IT','MA','TN','TR']);
  const districts=new Set(plan.districts.map(row=>row.id));
  for(const platform of plan.heritagePlatforms){
    assert.ok(districts.has(platform.district),platform.code);
    assert.ok(platform.services.includes('country_access'),platform.code);
    assert.ok(platform.services.includes('fast_travel'),platform.code);
  }
  assert.equal(plan.verticalLinks.length,8);
  for(const link of plan.verticalLinks){
    assert.ok(districts.has(link.from),link.id+':from');
    assert.ok(districts.has(link.to),link.id+':to');
    assert.ok(link.level>=1&&link.level<=3,link.id);
  }
});

test('Hub evolution has five visible stages driven by restored heritage',()=>{
  assert.equal(plan.evolution.source,'seals_and_restored_regions');
  assert.equal(plan.evolution.stages.length,5);
  assert.deepEqual(plan.evolution.stages.map(stage=>stage.stage),[0,1,2,3,4]);
  assert.deepEqual(plan.evolution.stages.map(stage=>stage.minFragments),[0,1,3,5,8]);
  assert.equal(plan.evolution.stages.at(-1).activeSkybridges,8);
  assert.equal(plan.evolution.stages.at(-1).platformGlow,1);
});


test('Hub V4 locks the exact 0→8 physical story milestones',()=>{
  assert.equal(plan.status,'Hub3B_Main_V05 · Cité des Huit Héritages · V4 jouable');
  assert.equal(plan.fragmentMilestones.length,9);
  assert.deepEqual(plan.fragmentMilestones.map(row=>row.fragments),[0,1,2,3,4,5,6,7,8]);
  assert.equal(plan.fragmentMilestones[1].id,'circle_heartbeat');
  assert.equal(plan.fragmentMilestones[4].id,'tower_transformation');
  assert.equal(plan.fragmentMilestones[7].id,'beyond_the_guardians');
  assert.equal(plan.fragmentMilestones[8].id,'circle_restored');
});

test('Hub V4 gives every district a landmark and every country esplanade a useful facility',()=>{
  assert.equal(plan.districtLandmarks.length,10);
  assert.equal(new Set(plan.districtLandmarks.map(row=>row.district)).size,10);
  assert.equal(plan.heritagePlatforms.length,8);
  for(const platform of plan.heritagePlatforms){
    assert.ok(platform.facility?.name,platform.code);
    assert.ok(platform.facility?.purpose?.length>12,platform.code);
    assert.ok(platform.facility?.services?.length>=3,platform.code);
  }
  const facilities=Object.fromEntries(plan.heritagePlatforms.map(row=>[row.code,row.facility.name]));
  assert.equal(facilities.FR,'Tribunal 3B');
  assert.equal(facilities.DZ,'Maison des Alliances');
  assert.equal(facilities.MA,'Atelier des Savoir-Faire');
  assert.equal(facilities.TN,'Poste de Sauvetage Maritime');
});

test('Hub V4 has a structural water network and useful Cité Origine fabric',()=>{
  assert.ok(plan.waterNetwork.features.length>=5);
  assert.ok(plan.waterNetwork.features.some(row=>row.kind==='basin'));
  assert.ok(plan.waterNetwork.features.some(row=>row.kind==='canal'));
  assert.ok(plan.waterNetwork.features.filter(row=>row.kind==='cascade').length>=2);
  assert.ok(plan.civicFabric.uses.includes('housing'));
  assert.ok(plan.civicFabric.uses.includes('school'));
  assert.ok(plan.civicFabric.uses.includes('clinic'));
  assert.ok(plan.civicFabric.minimumUsefulFrontagesPerDistrict>=6);
});


test('Hub V4 canon stores the story, laws, safe-zone and frozen 16-weapon base',()=>{
  assert.equal(plan.visualReference,'user-master://La Cité des Huit Héritages');
  assert.match(plan.repositorySchematic,/cite-huit-heritages-schematic-v2\.svg$/);
  assert.equal(plan.safeZone.hubIsOnlyMajorSafeZone,true);
  assert.equal(plan.safeZone.monsters,false);
  assert.equal(plan.safeZone.hostileDamage,false);
  assert.equal(plan.safeZone.wildPvp,false);
  assert.ok(plan.laws.length>=12);
  assert.ok(plan.laws.some(rule=>rule.includes('Portes restent dispersées')));
  assert.ok(plan.laws.some(rule=>rule.includes('Kaïs reste le héros central')));
  assert.equal(plan.arsenal.canonicalWeapons,16);
  assert.equal(plan.arsenal.frozenBase,true);
  assert.match(plan.story.finalThreat,/Monstre de l’Oubli/);
  assert.match(plan.story.playerRole,/propre personnage/);
  assert.deepEqual(plan.gameLoop.slice(0,4),['connexion','hub','préparation','quartier_utile']);
  assert.equal(plan.gameLoop.at(-1),'porte_suivante');
  assert.equal(plan.npcMemory.persistent,true);
  assert.ok(plan.npcMemory.affects.includes('dialogue'));
  assert.ok(plan.npcMemory.affects.includes('quêtes'));
});
