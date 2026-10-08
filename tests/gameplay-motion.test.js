import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameplayMotion,PLAY_ACTIONS,battleAnimation} from '../src/world/gameplay-motion.js';
import {advanceMotion} from '../src/world/motion.js';
import {defaultControlBindings,controlBindingConflicts,normalizeControlBindings} from '../src/world/control-bindings.js';
import {readHudPreferences,writeHudPreferences} from '../src/world/hud-preferences.js';

test('jump has finite lift, lands once and rejects repeated launch independently of an aerial strike',()=>{
 const m=createGameplayMotion();assert.equal(m.start('jump'),true);assert.equal(m.start('jump'),false);
 assert.equal(m.start('strike'),true);let frame=m.update(.18);assert.ok(frame.lift>1);assert.equal(frame.action,'strike');
 m.update(.25);m.update(.25);frame=m.update(.1);assert.equal(frame.landed,true);assert.equal(frame.lift,0);assert.equal(m.update(.1).landed,false);
 assert.equal(m.start('jump'),true);
});
test('takeoff cancels every previous ground action, including guard and dodge',()=>{
 for(const kind of ['strike','guard','power','dodge']){
  const m=createGameplayMotion();assert.equal(m.start(kind),true);m.update(.05);
  assert.equal(m.start('jump'),true);const frame=m.update(.05);
  assert.equal(frame.airborne,true);assert.equal(frame.action,null);assert.equal(frame.guard,0);assert.equal(frame.dodge,null);
 }
});
test('aerial strikes, guards and powers retain the jump clock and use independent cooldowns',()=>{
 for(const kind of ['strike','guard','power']){
  const m=createGameplayMotion(),reference=createGameplayMotion();m.start('jump');reference.start('jump');
  assert.equal(m.start(kind),true,kind+' is available during a jump');
  assert.equal(m.start(kind),false,kind+' cannot repeat before its own cooldown');
  for(let i=0;i<4;i++){const frame=m.update(.18),expected=reference.update(.18);assert.equal(frame.lift,expected.lift);assert.equal(frame.airborne,expected.airborne);assert.equal(frame.landed,expected.landed);}
  m.update(.11);assert.equal(m.start('jump'),true,'action cooldown does not consume the next jump');
  assert.equal(m.start(kind),kind!=='power','the power cooldown remains active across landing and the next jump');
 }
});
test('an aerial dodge rejection consumes no cooldown and a late aerial power survives landing',()=>{
 const m=createGameplayMotion();m.start('jump');assert.equal(m.start('dodge'),false);
 m.update(.25);m.update(.25);assert.equal(m.start('power'),true);
 const frame=m.update(.23);assert.equal(frame.landed,true);assert.equal(frame.action,'power');assert.equal(frame.dodge,null);
 m.update(.25);m.update(.25);assert.equal(m.start('dodge'),true,'dodge is available after the aerial action ends');
});
test('combat presentation sees takeoff before the first frame and recovers after landing or reset',()=>{
 const m=createGameplayMotion();assert.equal(m.airborne,false);m.start('jump');assert.equal(m.airborne,true);
 for(const kind of ['strike','guard','power','enemy','miss','support','trap'])assert.equal(battleAnimation(kind,m.airborne),null);
 m.update(.25);m.update(.25);m.update(.23);assert.equal(m.airborne,false);
 assert.equal(battleAnimation('strike',m.airborne),'Attack');assert.equal(battleAnimation('guard',m.airborne),'Guard');
 m.update(.1);m.start('jump');m.reset();assert.equal(m.airborne,false);
});
test('action locks, guard recovery and power cooldown are tied to seconds',()=>{
 const m=createGameplayMotion();assert.equal(m.start('power'),true);assert.equal(m.start('strike'),false);
 for(let i=0;i<3;i++)m.update(.25);assert.equal(m.start('strike'),true);assert.equal(m.start('power'),false);
 for(let i=0;i<5;i++)m.update(.25);assert.equal(m.start('power'),true);assert.equal(m.start('unknown'),false);
});
test('dodge direction is finite, ends and uses collision movement without teleporting through walls',()=>{
 const m=createGameplayMotion();m.start('dodge',Math.PI/2);const f=m.update(.1);assert.ok(Math.abs(f.dodge.x-1)<1e-9);
 const moved=advanceMotion({position:{x:0,z:0},target:null,route:[]},f.dodge,.1,f.dodge.speed,[{x:1,z:0,r:.7}],76);
 assert.ok(moved.position.x<.4);assert.ok(Math.abs(moved.position.z)<.01);
 m.update(.25);assert.equal(m.update(0).dodge,null);m.reset();assert.equal(m.start('dodge'),true);
});
test('new actions coexist with AZERTY/QWERTY and old saved bindings migrate',()=>{
 const bindings=defaultControlBindings();assert.deepEqual(controlBindingConflicts(bindings),[]);
 for(const id of Object.keys(PLAY_ACTIONS))assert.ok(bindings[id]?.length);
 const restored=normalizeControlBindings({moveForward:['w']});assert.deepEqual(restored.jump,[' ']);assert.deepEqual(restored.dodge,['x']);
});
test('dodges follow the compass heading in all four cardinal directions',()=>{
 for(const [angle,x,z] of [[0,0,-1],[Math.PI/2,1,0],[Math.PI,0,1],[-Math.PI/2,-1,0]]){
  const m=createGameplayMotion();m.start('dodge',angle);const frame=m.update(.05);
  assert.ok(Math.abs(frame.dodge.x-x)<1e-9);assert.ok(Math.abs(frame.dodge.z-z)<1e-9);
 }
});
test('HUD choices persist independently and recover from invalid storage',()=>{
 let value='{"map":false,"missions":false,"companion":"invalid"}';const storage={getItem:()=>value,setItem:(_,v)=>value=v};
 const hud=readHudPreferences(storage);assert.equal(hud.map,false);assert.equal(hud.missions,false);assert.equal(hud.companion,true);
 writeHudPreferences({...hud,map:true},storage);assert.equal(readHudPreferences(storage).map,true);
 value='broken';assert.equal(readHudPreferences(storage).details,true);
});
