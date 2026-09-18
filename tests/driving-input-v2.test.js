import test from 'node:test';
import assert from 'node:assert/strict';
import {createDrivingControlState,shapeAnalog,steeringAuthority,updateDrivingControlState} from '../src/games/underground/DrivingInputV2.js';
import {DEFAULT_VEHICLE,createVehicleState,stepVehicle} from '../src/games/underground/carModel.js';

function simulate(fps,seconds,raw,speedMps=0){
  let state=createDrivingControlState();
  const dt=1/fps;
  for(let i=0;i<fps*seconds;i++)state=updateDrivingControlState(state,raw,dt,speedMps);
  return state;
}

test('DrivingInputV2 is effectively frame-rate independent',()=>{
  const a=simulate(30,1,{throttle:1,steer:.75},22);
  const b=simulate(60,1,{throttle:1,steer:.75},22);
  assert.ok(Math.abs(a.throttle-b.throttle)<1e-6);
  assert.ok(Math.abs(a.steer-b.steer)<1e-6);
});

test('steering dead-zone removes accidental micro input',()=>{
  assert.equal(shapeAnalog(.03),0);
  assert.equal(shapeAnalog(-.04),0);
  assert.ok(shapeAnalog(.5)>0);
});

test('steering authority is reduced at high speed',()=>{
  assert.equal(steeringAuthority(0),1);
  assert.ok(steeringAuthority(60)<steeringAuthority(20));
  assert.ok(steeringAuthority(100)>=.42);
});

test('vehicle acceleration ramps instead of jumping to full throttle',()=>{
  let state=createVehicleState();
  state=stepVehicle(DEFAULT_VEHICLE,state,{throttle:1,brake:0,steer:0,nitrous:false},1/60,{grip:1,slope:0});
  assert.ok(state.controls.throttle>0);
  assert.ok(state.controls.throttle<.2);
  for(let i=0;i<120;i++)state=stepVehicle(DEFAULT_VEHICLE,state,{throttle:1,brake:0,steer:0,nitrous:false},1/60,{grip:1,slope:0});
  assert.ok(state.controls.throttle>.95);
  assert.ok(state.speedMps>0);
});
