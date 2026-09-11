import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave,teamStats} from '../src/world/rules.js';
import {applyWorldAction,advanceBattle} from '../src/world/engine.js';
import {frontierState,masteryLevel} from '../src/world/frontier.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {createArchitecture} from '../src/world/architecture.js';
import {orbitView,DEFAULT_ORBIT} from '../src/world/orbit.js';
import {obstacleDistance} from '../src/world/collision.js';
import {createTerrainField} from '../src/world/terrain.js';

const act=(s,type,extra={})=>applyWorldAction(s,{type,...extra});
function victory(s){for(let i=0;i<120&&!s.adventure.encounter.result;i++){const e=s.adventure.encounter;const action=e.intent==='rituel'&&e.focus>=2?'power':e.hp<e.maxHP-20||['double','percée','vague','sable','gel'].includes(e.intent)?'guard':e.focus>=2?'power':'strike';s=act(s,'battle',{action});}assert.equal(s.adventure.encounter.result,'victory');return s;}

test('repeatable expeditions renew supplies and train each companion once, without ending the world',()=>{
 for(const country of COUNTRIES){let s=act(blankSave(),'visit',{region:country.id});const leader=s.leader;
  for(let n=0;n<4;n++){
   s=act(s,'gather',{resource:'wood'});s=act(s,'gather',{resource:'stone'});s=act(s,'gather',{resource:'food'});
   assert.throws(()=>act(s,'gather',{resource:'wood'}),/reviendra/);
   s=act(s,'patrol');const food=frontierState(s).food;s=normalizeSave(s);assert.equal(s.adventure.encounter.patrol,true);s=victory(s);
   assert.equal(frontierState(s).expedition,n+1);assert.equal(frontierState(s).food,food);assert.deepEqual(frontierState(s).harvest,[]);assert.equal(s.adventure.mastery[leader],(n+1)*30);
   assert.throws(()=>act(s,'battle',{action:'strike'}),/terminée/);s=act(s,'leave');
  }
  assert.equal(s.adventure.finished,false);assert.equal(masteryLevel(s.adventure.mastery[leader]),1);assert.ok(teamStats(s).attack>teamStats(blankSave()).attack);
 }
});
test('construction spends local resources; a failed expedition never erases the home or mastery',()=>{
 let s=act(blankSave(),'visit',{region:'maroc'});assert.throws(()=>act(s,'build',{building:'camp'}),/Récolte/);assert.throws(()=>act(s,'build',{building:'invented'}),/inconnue/);
 s=act(s,'gather',{resource:'wood'});s=act(s,'gather',{resource:'stone'});s=act(s,'build',{building:'garden'});assert.equal(frontierState(s).wood,0);assert.equal(frontierState(s).stone,1);
 s=act(s,'gather',{resource:'food'});assert.equal(frontierState(s).food,6);s=act(s,'patrol');s=act(s,'leave');assert.equal(frontierState(s).food,5);assert.equal(frontierState(s).garden,1);assert.equal(frontierState(s).expedition,0);
 s=act(s,'visit',{region:'hub'});s=act(s,'visit',{region:'italie'});assert.equal(frontierState(s).garden,0);assert.equal(s.adventure.frontier.maroc.garden,1);
});
test('dodge costs concentration, avoids piercing damage and creates a single counterattack opening',()=>{
 let s=act(act(blankSave(),'visit',{region:'france'}),'patrol'),e={...s.adventure.encounter,enemy:600,enemyMax:600,intent:'percée',focus:2};
 const dodge=advanceBattle(e,'dodge');assert.equal(dodge.hp,e.hp);assert.equal(dodge.focus,1);assert.equal(dodge.opening,true);
 const a=advanceBattle({...dodge,intent:'frappe'},'strike'),b=advanceBattle({...dodge,intent:'frappe',opening:false},'strike');assert.ok(a.enemy<b.enemy);assert.equal(a.opening,false);
 assert.throws(()=>advanceBattle({...e,focus:0},'dodge'),/concentration/);assert.equal(normalizeSave({...s,adventure:{...s.adventure,encounter:dodge}}).adventure.encounter.opening,true);
});
test('houses, storeys and every inhabited door are scaled for the avatar; towns use distinct curved streets',()=>{
 const architecture=createArchitecture(),plans=[];
 for(const c of COUNTRIES){for(const urban of [true,false]){const house=architecture.building(c.id,2,{urban}),d=house.userData.dimensions;assert.ok(d.doorHeight>=4.8);assert.ok(d.storey>d.doorHeight);assert.ok(d.width>=11);assert.ok(d.height>=5.6*(urban?2:1));}
 const f=createTerrainField(c.id,blankSave());assert.ok(f.buildings.length>=20);assert.ok(f.roads.some(r=>r.points.length>20));plans.push(JSON.stringify(f.roads));}
 assert.equal(new Set(plans).size,8);architecture.dispose();
});
test('chosen zoom is independent of town obstacles, height and region; footprint collision handles rotated houses',()=>{
 for(const portrait of [false,true])for(const height of [0,8,-2])for(const yaw of [0,1.8,-2.4]){const orbit={...DEFAULT_ORBIT,distance:36,yaw},view=orbitView(orbit,{x:15,z:-30},height,portrait);assert.ok(Math.abs(Math.hypot(view.position.x-view.target.x,view.position.y-view.target.y,view.position.z-view.target.z)-36*(portrait?1.12:1))<1e-9);}
 const house={x:0,z:0,width:12,depth:10,rotation:Math.PI/2};assert.ok(obstacleDistance({x:0,z:5.8},house)<0);assert.ok(obstacleDistance({x:5.8,z:0},house)>0);assert.equal(obstacleDistance({x:0,z:0},{...house,enabled:false}),Infinity);
});
