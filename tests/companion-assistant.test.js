import test from 'node:test';
import assert from 'node:assert/strict';
import { companionGaze, companionGuidance, companionTouch } from '../src/companion/companion-assistant.js';

test('the live secret takes priority and suggestions never navigate to the current page',()=>{
  for(const phase of ['open','attempt']){
    const home=companionGuidance({page:'home',secretPhase:phase,memberRegistered:true});
    assert.equal(home.actions[0].page,'secret');
    const secret=companionGuidance({page:'secret',secretPhase:phase,memberRegistered:true});
    assert.ok(secret.actions.every(action=>action.page!=='secret'));
    assert.ok(secret.message.includes('ouvert'));
  }
  const closed=companionGuidance({page:'secret',secretPhase:'closed'});
  assert.ok(!closed.message.includes('ouvert'));
});

test('member suggestions distinguish registration from the existing account',()=>{
  const guest=companionGuidance({page:'home',memberRegistered:false});
  const member=companionGuidance({page:'home',memberRegistered:true});
  assert.equal(guest.actions.find(action=>action.page==='member').label,'Connexion / inscription');
  assert.equal(member.actions.find(action=>action.page==='member').label,'Mon espace membre');
  assert.ok(companionGuidance({page:'member'}).actions.every(action=>action.page!=='member'));
});

test('gaze stays within the visor and malformed coordinates restore the neutral pose',()=>{
  const rect={left:0,top:0,width:100,height:120};
  for(const point of [[-10000,-10000],[10000,10000],[50,60]]){
    const gaze=companionGaze(...point,rect);
    assert.ok(Math.abs(gaze.x)<=5&&Math.abs(gaze.y)<=3);
  }
  assert.deepEqual(companionGaze(NaN,2,rect),{x:0,y:0});
  assert.deepEqual(companionGaze(1,2,null),{x:0,y:0});
});

test('touch responses are bounded cosmetic gestures without invented rewards',()=>{
  assert.equal(companionTouch('reward'),null);
  assert.equal(companionTouch('invalid'),null);
  for(const kind of ['hello','curious','rest']){
    const response=companionTouch(kind);
    assert.ok(response.duration>=1000&&response.duration<=4000);
    assert.doesNotMatch(response.message,/XP|gagné|points|récompense/i);
  }
});
