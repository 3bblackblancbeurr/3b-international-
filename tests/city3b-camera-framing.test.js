import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {cityCameraFrame} from '../src/city/city3b-camera-framing.js';
import {cityBuildingHeight} from '../src/city/city3b-model-preview.js';

test('framing keeps every building corner visible in portrait, landscape and rotated views',()=>{
 for(const aspect of [.46,1,2.2])for(const yaw of [0,1.5,3.1])for(const size of [[2,2,12],[12,10,20],[24,12,30]]){
  const [width,depth,height]=size,center={x:40,z:-20},ground=3;
  const frame=cityCameraFrame({center,width,depth,height,aspect,yaw,ground});
  const camera=new PerspectiveCamera(40,aspect,.1,10000);camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld();
  for(const dx of [-1,1])for(const dz of [-1,1])for(const y of [ground,ground+height]){
   const p=new Vector3(center.x+dx*width/2,y,center.z+dz*depth/2).project(camera);
   assert.ok(Math.abs(p.x)<.7&&Math.abs(p.y)<.7,'model fits with space reserved for contextual menus');
  }
 }
});
test('the municipal landmark stays visibly taller than homes on old and new parcels',()=>{
 assert.ok(cityBuildingHeight(12,10,'civic','CITY_HALL_3B')>=17);
 assert.ok(cityBuildingHeight(2,2,'civic','CITY_HALL_3B')>=11.5);
 assert.ok(cityBuildingHeight(12,10,'civic','CITY_HALL_3B')>2*cityBuildingHeight(6,5,'housing','HOME_ORIGIN'));
});
