import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityRequestGate} from '../src/city/request-gate.js';

test('City responses cannot cross an account switch, even when the old account returns later',()=>{
 const gate=createCityRequestGate();gate.scope('alice');const a=gate.begin();
 gate.scope('bob');const b=gate.begin();
 assert.equal(gate.accepts(a),false);assert.equal(gate.accepts(b),true);
 gate.scope('alice');assert.equal(gate.accepts(a),false);
 const next=gate.begin();assert.equal(gate.accepts(next),true);
});
test('closing, signing out and unmounting invalidate pending City responses',()=>{
 const gate=createCityRequestGate();gate.scope('alice');let ticket=gate.begin();
 gate.scope('alice',false);assert.equal(gate.accepts(ticket),false);assert.equal(gate.begin(),null);
 gate.scope('alice',true);ticket=gate.begin();gate.invalidate();assert.equal(gate.accepts(ticket),false);
 ticket=gate.begin();gate.scope(null);assert.equal(gate.accepts(ticket),false);assert.equal(gate.begin(),null);
});
test('a superseded City request cannot overwrite the latest snapshot',()=>{
 const gate=createCityRequestGate();gate.scope('alice');const first=gate.begin(),second=gate.begin();
 assert.equal(gate.accepts(first),false);assert.equal(gate.accepts(second),true);
 gate.scope('alice');assert.equal(gate.accepts(second),true);
});
