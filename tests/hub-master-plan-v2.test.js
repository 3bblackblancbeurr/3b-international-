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

test('Hub Gold Master preserves eight countries, guardians and canonical values', () => {
  assert.equal(plan.version, '3.0.0');
  assert.equal(plan.status, 'goldmaster-canonical');
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

test('Hub Gold Master districts, buildings and transport references are consistent', () => {
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


test('the approved Cité reference forbids a central eight-gate wheel and fixes eight dispersed physical gates',()=>{
  assert.match(plan.visualContract.rule,/huit Portes physiques dispersées/);
  assert.ok(plan.visualContract.composition.forbidden.some(value=>/huit portes collées/i.test(value)));
  const positions=plan.countries.map(country=>country.gateWorld);
  assert.equal(positions.length,8);
  assert.equal(new Set(positions.map(position=>position.join(','))).size,8);
  for(const country of plan.countries){
    assert.ok(country.region);
    assert.ok(country.color);
    assert.ok(Array.isArray(country.gateWorld)&&country.gateWorld.length===2);
    assert.ok(Math.hypot(country.gateWorld[0],country.gateWorld[1])>500,country.code);
    assert.ok(Math.hypot(country.gateWorld[0],country.gateWorld[1])<820,country.code);
  }
});

test('Hub evolution law links restored Guardians to visible district and central milestones',()=>{
  assert.equal(plan.evolution.districtRestoration,true);
  assert.deepEqual(plan.evolution.centralMilestones.map(step=>step.fragments),[0,1,2,4,6,8]);
  assert.ok(plan.evolution.visibleChanges.includes('Portes restaurées'));
  assert.ok(plan.evolution.visibleChanges.includes('Tour du Cercle Brisé'));
});
