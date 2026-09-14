import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CinematicDetailPass} from '../src/games/underground/CinematicDetailPass.js';
import {createModularVehicleProxy,updateProxyRuntime} from '../src/games/underground/ModularVehicleProxy.js';
import {DEFAULT_VEHICLE} from '../src/games/underground/carModel.js';

function curve(){return new THREE.CatmullRomCurve3([
  new THREE.Vector3(-40,0,-20),new THREE.Vector3(20,1,-45),new THREE.Vector3(55,0,5),new THREE.Vector3(25,3,50),new THREE.Vector3(-45,0,35)
],true,'catmullrom',.25);}

function dispose(root){root.traverse(o=>{o.geometry?.dispose?.();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());});}

test('cinematic detail pass adds wet-road, lighting and architecture layers',()=>{
  const scene=new THREE.Scene(),pass=new CinematicDetailPass(scene,curve(),{id:'france-cinema-test',countryId:'france',weather:'rain'},{quality:'high',palette:{warm:0xffb66e,gold:0xd7b76b,matrix:0x356dff}});
  assert.ok(pass.root.children.length>=8);assert.ok(pass.puddleMesh.count>25);assert.ok(pass.warmPools.count+pass.coolPools.count>10);assert.ok(pass.shafts.length>=4);
  const state=pass.update({progress:.5,speedKph:220,wetness:.82,dt:.016});assert.equal(state.zone.id,'tunnel');assert.equal(state.detailGrade,'high');assert.ok(pass.materials.puddle.opacity>.3);dispose(pass.root);
});

test('modular vehicle proxy supports runtime wheel motion and cinematic materials',()=>{
  const proxy=createModularVehicleProxy(DEFAULT_VEHICLE);const wheels=proxy.userData.wheels;assert.ok(wheels.length>=8);const before=wheels[0].rotation.x;updateProxyRuntime(proxy,DEFAULT_VEHICLE,{speedKph:180,time:1,steer:.4,brake:1});assert.notEqual(wheels[0].rotation.x,before);assert.ok(proxy.children.length>18);dispose(proxy);
});
