import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAvatar,blankAvatar} from '../src/world/avatar-rules.js';
import {DEFAULT_ORBIT,rotateOrbit,zoomOrbit,cameraRelative} from '../src/world/orbit.js';
import {blankSave,teamStats} from '../src/world/rules.js';import {applyWorldAction} from '../src/world/engine.js';
test('avatar identity is independent from gameplay power and rejects invalid data',()=>{
 const avatar=normalizeAvatar({created:true,name:'Aïcha',body:'femme',nationality:'Japon et Brésil',hair:4,face:.8,jaw:-.5,nose:.2,path:'nature'});
 assert.equal(avatar.body,'femme');assert.equal(avatar.nationality,'Japon et Brésil');assert.equal(avatar.face,.8);
 const s=applyWorldAction(blankSave(),{type:'avatar',avatar});assert.equal(s.adventure.avatar.name,'Aïcha');
 assert.deepEqual(teamStats(s),teamStats({...s,adventure:{...s.adventure,avatar:{...avatar,body:'homme',nationality:'France'}}}));
 const bad=normalizeAvatar({created:true,name:'<script>',face:Infinity,skin:999,hair:-1,hairColor:'url(javascript:x)'});assert.equal(bad.face,0);assert.equal(bad.skin,2);assert.equal(bad.hairColor,blankAvatar().hairColor);
 assert.throws(()=>applyWorldAction(blankSave(),{type:'avatar',avatar:{name:'',created:true}}));
});
test('free camera controls remain bounded and movement follows camera without speed boost',()=>{
 const a=rotateOrbit(DEFAULT_ORBIT,100,-10000);assert.notEqual(a.yaw,DEFAULT_ORBIT.yaw);assert.equal(a.pitch,.16);
 assert.equal(rotateOrbit(a,0,10000).pitch,1.15);assert.equal(zoomOrbit(a,-10000).distance,10);assert.equal(zoomOrbit(a,10000).distance,52);
 for(const yaw of [0,Math.PI/2,Math.PI,20]){const p=cameraRelative(.4,-.8,yaw);assert.ok(Math.abs(Math.hypot(p.x,p.z)-Math.hypot(.4,.8))<1e-10);}
 const p=cameraRelative(0,-1,Math.PI/2);assert.ok(Math.abs(p.x+1)<1e-10);assert.ok(Math.abs(p.z)<1e-10);
});
