import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HeroArchitecturePass} from '../src/games/underground/HeroArchitecturePass.js';

function makeCurve(){return new THREE.CatmullRomCurve3([
  new THREE.Vector3(-60,0,-20),new THREE.Vector3(-10,0,-60),new THREE.Vector3(55,1,-25),new THREE.Vector3(60,3,40),new THREE.Vector3(0,0,65),new THREE.Vector3(-55,0,35)
],true,'catmullrom',.25);}
function dispose(root){root.traverse(o=>{o.geometry?.dispose?.();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());});}

test('France hero architecture adds recognizable near-road structures',()=>{
  const scene=new THREE.Scene(),pass=new HeroArchitecturePass(scene,makeCurve(),{id:'hero-test',countryId:'france'},{quality:'high',palette:{warm:0xffb66e,gold:0xd7b76b,matrix:0x356dff}});
  assert.ok(pass.root.children.length>=10);assert.equal(pass.update().heroArchitecture,true);dispose(pass.root);
});

test('non-France territories skip France-specific hero kit',()=>{
  const scene=new THREE.Scene(),pass=new HeroArchitecturePass(scene,makeCurve(),{id:'dz-test',countryId:'algeria'},{quality:'high',palette:{warm:0xffb66e,gold:0xd7b76b,matrix:0x356dff}});
  assert.equal(pass.root.children.length,0);assert.equal(pass.update().heroArchitecture,false);dispose(pass.root);
});
