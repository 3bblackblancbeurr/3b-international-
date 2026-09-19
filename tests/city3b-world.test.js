import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY3B_POIS,city3bVisualStage} from '../src/city/city3b-world.js';

test('Ville 3B visual stage scales with real city progress',()=>{
  const empty=city3bVisualStage({city:{city_level:1},placements:[],districts:[]});
  const grown=city3bVisualStage({city:{city_level:6},placements:Array.from({length:12},(_,id)=>({id})),districts:Array.from({length:8},(_,i)=>({country:String(i),unlocked:true}))});
  assert.equal(empty.towers.length,12);
  assert.equal(grown.unlocked,8);
  assert.equal(grown.placements,12);
  assert.ok(grown.density>empty.density);
  assert.ok(grown.towers.filter(t=>t.active).length>=empty.towers.filter(t=>t.active).length);
});

test('Ville 3B defines the core premium social and mobility places',()=>{
  const ids=new Set(CITY3B_POIS.map(p=>p.id));
  for(const id of ['heritage-plaza','3b-store','matrix-mall','community-house','underground-garage','passport-terminal','matrix-station'])assert.ok(ids.has(id),id);
});
