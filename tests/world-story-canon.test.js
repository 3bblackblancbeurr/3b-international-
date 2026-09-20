import test from 'node:test';
import assert from 'node:assert/strict';
import {CANON_WORLDS,STORY_CANON,STORY_ACTS,STORY_REVELATIONS,FRANCE_CANON_ARC} from '../src/world/story-canon.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {WORLDS,QUESTS} from '../src/world/origins/data.js';
import {NEXUS_WORLDS} from '../src/components/nexus-worlds.js';

test('all world surfaces share the same eight canonical guardian/value pairs',()=>{
 const ids=Object.keys(CANON_WORLDS);
 assert.equal(ids.length,8);
 assert.equal(new Set(ids.map(id=>CANON_WORLDS[id].value)).size,8);
 for(const id of ids){
  const canon=CANON_WORLDS[id],guardian=GUARDIAN_VALUES[id],origin=WORLDS.find(world=>world.id===id),nexus=NEXUS_WORLDS.find(world=>world.id===id);
  assert.ok(guardian&&origin&&nexus,id);
  assert.equal(guardian.name,canon.guardian,id+' guardian runtime');
  assert.equal(guardian.value,canon.value,id+' value runtime');
  assert.equal(origin.guardian,canon.guardian,id+' guardian origins');
  assert.equal(origin.value,canon.value,id+' value origins');
  assert.equal(origin.associationStatus,'validated',id+' origins validation');
  assert.equal(nexus.guardian,canon.guardian,id+' guardian nexus');
  assert.equal(nexus.value,canon.value,id+' value nexus');
 }
});

test('Kais is the bearer of the link, never a ninth guardian or ninth value',()=>{
 assert.equal(STORY_CANON.hero.name,'Kaïs');
 assert.equal(STORY_CANON.hero.role,'Porteur du Lien');
 assert.match(STORY_CANON.hero.rule,/ni un neuvième Gardien ni le détenteur d’une neuvième valeur/);
 assert.match(STORY_CANON.hero.ring,/connecteur/);
 assert.equal(STORY_CANON.finale.requirement.countries,8);
 assert.equal(STORY_CANON.finale.requirement.guardians,8);
 assert.equal(STORY_CANON.finale.requirement.values,8);
 assert.equal(STORY_CANON.finale.requirement.fragments,8);
});

test('canonical story contains prologue revelation finale and open epilogue',()=>{
 assert.equal(STORY_ACTS[0].id,'prologue');
 assert.ok(STORY_ACTS.some(act=>act.id==='oubli-truth'));
 assert.ok(STORY_ACTS.some(act=>act.id==='kais-truth'));
 assert.ok(STORY_ACTS.some(act=>act.id==='finale'));
 assert.equal(STORY_ACTS.at(-1).id,'epilogue');
 assert.equal(STORY_REVELATIONS.at(-1).after,8);
 assert.match(STORY_REVELATIONS.at(-1).truth,/Kaïs/);
});

test('legacy France Justice quests are now explicit acts of Les noms effaces',()=>{
 const main=QUESTS.filter(quest=>quest.kind==='main');
 assert.deepEqual(main.map(quest=>quest.id),FRANCE_CANON_ARC.acts.map(act=>act.id));
 assert.deepEqual(main.map(quest=>quest.title),FRANCE_CANON_ARC.acts.map(act=>act.title));
 assert.ok(main.every((quest,index)=>quest.campaign===FRANCE_CANON_ARC.title&&quest.act===index+1));
});
