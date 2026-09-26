import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {hubRuntime} from '../src/world/hub/runtime-data.js';

const expectedStage=count=>count>=8?4:count>=5?3:count>=3?2:count>=1?1:0;

function restoredSave(regions){
  const base=blankSave();
  const chapters={...base.adventure.chapters};
  for(const region of regions){
    chapters[region]={
      helped:true,
      powers:['ally','ambiance','terrain'],
      solved:true,
      restored:3,
      challenge:false,
      choice:'garden',
      board:[],
    };
  }
  return normalizeSave({...base,seals:[...regions],adventure:{...base.adventure,chapters}});
}
test('each restored kingdom cumulatively transforms the Hub through 8/8',()=>{
  const order=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
  const knownCountries=new Set(COUNTRIES.map(country=>country.id));
  assert.deepEqual(new Set(order),knownCountries);

  for(let count=1;count<=order.length;count++){
    const restored=order.slice(0,count),save=restoredSave(restored);
    const hub=hubRuntime('desktop',{
      seals:save.seals,
      restoredRegions:restored,
      storyProgress:true,
      hubState:save.hub,
      weather:'clear',
      hour:14,
      day:2,
      dateKey:'2026-09-25',
    });

    assert.equal(hub.meta.fragmentCount,count);
    assert.equal(hub.meta.evolutionStage,expectedStage(count));
    for(const region of restored){
      const platform=hub.items.find(item=>item.type==='hubHeritagePlatform'&&item.regionId===region);
      const guardian=hub.items.find(item=>item.type==='hubGuardian'&&item.region===region);
      assert.ok(platform,region+' platform');
      assert.equal(platform.restored,true,region+' restored');
      assert.equal(platform.liberated,true,region+' liberated');
      assert.ok(guardian,region+' guardian');
      assert.equal(guardian.name,GUARDIAN_VALUES[region].name);
      assert.equal(guardian.value,GUARDIAN_VALUES[region].value);
    }

    assert.equal(hub.items.filter(item=>item.type==='hubGuardian').length,count);
    assert.equal(hub.items.filter(item=>item.type==='hubHeritagePlatform'&&item.restored).length,count);
  }
});
test('eight restored kingdoms produce the complete Circle state',()=>{
  const restored=COUNTRIES.map(country=>country.id),save=restoredSave(restored);
  const hub=hubRuntime('desktop',{
    seals:save.seals,
    restoredRegions:restored,
    storyProgress:true,
    storyFlag:true,
    hubState:save.hub,
    weather:'clear',
    hour:20,
    day:6,
    dateKey:'2026-09-25',
  });
  assert.equal(hub.meta.fragmentCount,8);
  assert.equal(hub.meta.evolutionStage,4);
  assert.equal(hub.meta.milestone.id,'circle_restored');
  assert.equal(hub.meta.nextMilestone,null);
  assert.equal(hub.items.filter(item=>item.type==='hubGuardian').length,8);
});
