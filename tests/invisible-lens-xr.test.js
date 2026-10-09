import test from 'node:test';
import assert from 'node:assert/strict';
import {Matrix4,PerspectiveCamera,Quaternion,Vector3} from 'three';
import {createXRSessionController,createLensCameraController,detectARSupport,validPoseMatrix,horizontalPoseMatrix} from '../src/world/invisible/xr-session.js';
import {createLensViewController,deviceOrientationQuaternion,worldPlacementMatrix} from '../src/world/invisible/lens-view.js';

const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
class Session extends EventTarget{
 ends=0;cancels=0;spaces=[];
 async requestReferenceSpace(type){this.spaces.push(type);return {type};}
 async requestHitTestSource(options){this.sourceOptions=options;return {cancel:()=>this.cancels++};}
 async end(){this.ends++;this.dispatchEvent(new Event('end'));}
}
test('support detection never requests a session or infers AR from a camera',async()=>{
 let requests=0;const xr={isSessionSupported:async mode=>mode==='immersive-ar',requestSession:()=>requests++};
 assert.equal(await detectARSupport(xr),true);assert.equal(requests,0);assert.equal(await detectARSupport({}),false);
 assert.equal(await detectARSupport({isSessionSupported:async()=>{throw Error();},requestSession(){}}),false);
});
test('real frame pose is copied, placed only by select, and handles are released',async()=>{
 const session=new Session(),overlayRoot={},poses=[],selections=[],states=[];let requested;session.domOverlayState={type:'screen'};
 const controller=createXRSessionController({xr:{requestSession:async(mode,options)=>{requested={mode,options};return session;}},overlayRoot,attachSession:async()=>({type:'renderer-local'}),onPose:pose=>poses.push(pose),onSelect:event=>selections.push(event),onState:state=>states.push(state.phase)});
 assert.equal(await controller.start(),true);assert.equal(requested.mode,'immersive-ar');assert.deepEqual(requested.options.requiredFeatures,['hit-test','local','dom-overlay']);assert.equal(requested.options.optionalFeatures,undefined);assert.equal(requested.options.domOverlay.root,overlayRoot);
 const matrix=identity();matrix[12]=1.25;let poseSpace;
 controller.frame({session,getHitTestResults:source=>{assert.ok(source);return [{getPose:space=>{poseSpace=space;return {transform:{matrix}};}}];}});
 assert.equal(poseSpace.type,'renderer-local');assert.equal(poses.at(-1)[12],1.25);assert.equal(selections.length,0);
 matrix[12]=9;session.dispatchEvent(new Event('select'));assert.equal(selections[0].pose[12],1.25);
 controller.frame({session,getHitTestResults:()=>[]});session.dispatchEvent(new Event('select'));assert.equal(selections[1].pose,null);
 await controller.stop();assert.equal(session.ends,1);assert.equal(session.cancels,1);assert.equal(controller.active,false);
 session.dispatchEvent(new Event('select'));assert.equal(selections.length,2);assert.ok(states.includes('surface'));
});
test('native AR without an overlay root requests only its spatial features',async()=>{
 const session=new Session();let requested;
 const controller=createXRSessionController({xr:{requestSession:async(mode,options)=>{requested={mode,options};return session;}}});
 assert.equal(await controller.start(),true);assert.deepEqual(requested.options.requiredFeatures,['hit-test','local']);assert.equal(requested.options.domOverlay,undefined);assert.equal(requested.options.optionalFeatures,undefined);await controller.stop();
});
test('an unavailable required DOM overlay rejects AR without attaching renderer handles',async()=>{
 let attaches=0;const states=[];
 const controller=createXRSessionController({overlayRoot:{},xr:{requestSession:async(mode,options)=>{assert.ok(options.requiredFeatures.includes('dom-overlay'));throw new DOMException('DOM overlay unsupported','NotSupportedError');}},attachSession:()=>attaches++,onState:state=>states.push(state.phase)});
 await assert.rejects(controller.start(),{name:'NotSupportedError'});assert.equal(attaches,0);assert.equal(controller.active,false);assert.equal(controller.phase,'error');assert.deepEqual(states,['starting','error']);
});
test('a session accepting AR without its promised DOM overlay is ended before rendering',async()=>{
 const session=new Session();session.domOverlayState=null;let attaches=0;
 const controller=createXRSessionController({overlayRoot:{},xr:{requestSession:async()=>session},attachSession:()=>attaches++});
 await assert.rejects(controller.start(),/commandes AR/);assert.equal(attaches,0);assert.equal(session.ends,1);assert.equal(controller.active,false);assert.equal(controller.phase,'error');assert.deepEqual(session.spaces,[]);assert.equal(session.cancels,0);
});
test('closing while native permission is pending ends the late session without attaching',async()=>{
 const request=deferred(),session=new Session();let attaches=0;
 const controller=createXRSessionController({xr:{requestSession:()=>request.promise},attachSession:()=>attaches++});
 const started=controller.start();await controller.stop();request.resolve(session);assert.equal(await started,false);assert.equal(attaches,0);assert.equal(session.ends,1);
});
test('closing while hit-test source is pending cancels the returned source',async()=>{
 const session=new Session(),sourceRequest=deferred();let cancelled=0;
 session.requestHitTestSource=()=>sourceRequest.promise;
 const controller=createXRSessionController({xr:{requestSession:async()=>session}});
 const started=controller.start();await new Promise(resolve=>setImmediate(resolve));await controller.stop();sourceRequest.resolve({cancel:()=>cancelled++});
 assert.equal(await started,false);assert.equal(cancelled,1);assert.equal(session.ends,1);
});
test('native end clears hit source and ignores subsequent frames',async()=>{
 const session=new Session(),poses=[];
 const controller=createXRSessionController({xr:{requestSession:async()=>session},onPose:pose=>poses.push(pose)});await controller.start();
 await session.end();const count=poses.length;controller.frame({session,getHitTestResults:()=>{throw Error('stale');}});assert.equal(poses.length,count);assert.equal(session.cancels,1);
});
test('unsupported hit-test does not silently substitute an untracked AR session',async()=>{
 const session=new Session();session.requestHitTestSource=async()=>{throw Error('no hit test');};
 const controller=createXRSessionController({xr:{requestSession:async()=>session}});
 await assert.rejects(controller.start());assert.equal(session.ends,1);assert.equal(controller.phase,'error');assert.equal(controller.active,false);
 assert.equal(validPoseMatrix([1,2,3]),null);const invalid=identity();invalid[3]=NaN;assert.equal(validPoseMatrix(invalid),null);
});
test('an empty native hit-test source ends the session instead of claiming surface tracking',async()=>{
 const session=new Session();session.requestHitTestSource=async()=>null;
 const controller=createXRSessionController({xr:{requestSession:async()=>session}});
 await assert.rejects(controller.start(),/suivi de surface/);assert.equal(session.ends,1);assert.equal(controller.phase,'error');assert.equal(controller.active,false);
});
test('camera cancellation stops late streams and does not reopen the view',async()=>{
 const permission=deferred(),streams=[];let stops=0;
 const controller=createLensCameraController({mediaDevices:{getUserMedia:options=>{assert.equal(options.audio,false);return permission.promise;}},onStream:stream=>streams.push(stream)});
 const started=controller.start();controller.stop();permission.resolve({getTracks:()=>[{stop:()=>stops++}]});
 assert.equal(await started,false);assert.equal(stops,1);assert.equal(streams.some(Boolean),false);
});
test('a camera device interruption releases listeners and the active stream',async()=>{
 class Track extends EventTarget{stops=0;stop(){this.stops++;}}
 const track=new Track(),streams=[],states=[],stream={getTracks:()=>[track]};
 const controller=createLensCameraController({mediaDevices:{getUserMedia:async()=>stream},onStream:value=>streams.push(value),onState:value=>states.push(value)});
 assert.equal(await controller.start(),true);assert.equal(controller.active,true);track.dispatchEvent(new Event('ended'));
 assert.equal(controller.active,false);assert.equal(track.stops,1);assert.equal(streams.at(-1),null);assert.equal(states.at(-1),'idle');
 track.dispatchEvent(new Event('ended'));assert.equal(track.stops,1);
});
test('a rejected camera prompt after cancellation is an obsolete result',async()=>{
 const permission=deferred(),states=[];
 const controller=createLensCameraController({mediaDevices:{getUserMedia:()=>permission.promise},onState:value=>states.push(value)});
 const started=controller.start();controller.stop();permission.reject(Error('permission refused after exit'));
 assert.equal(await started,false);assert.equal(states.includes('error'),false);
});
test('closing while renderer attachment is pending never starts hit testing',async()=>{
 const session=new Session(),attached=deferred();let hitRequests=0;
 session.requestHitTestSource=()=>{hitRequests++;};
 const controller=createXRSessionController({xr:{requestSession:async()=>session},attachSession:()=>attached.promise});
 const started=controller.start();await new Promise(resolve=>setImmediate(resolve));await controller.stop();attached.resolve({type:'local'});
 assert.equal(await started,false);assert.equal(hitRequests,0);assert.equal(session.ends,1);
});

test('phone camera view turns in place at eye height and never pinch-zooms an overlay',()=>{
 const camera=new PerspectiveCamera(),look=createLensViewController(camera);
 look.setMode('camera');assert.deepEqual(camera.position.toArray(),[0,1.6,0]);
 const originalDirection=camera.getWorldDirection(new Vector3());assert.ok(originalDirection.distanceTo(new Vector3(0,0,-1))<1e-8);
 look.rotate(110,-25);assert.deepEqual(camera.position.toArray(),[0,1.6,0]);assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(originalDirection)>.3);
 const beforeZoom=camera.quaternion.clone();assert.equal(look.zoom(.5),false);assert.ok(camera.quaternion.angleTo(beforeZoom)<1e-8);
 const target=new Vector3(2,1.13,-2.8);look.focus(target,3.2);assert.deepEqual(camera.position.toArray(),[0,1.6,0]);
 assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(target.clone().sub(camera.position).normalize())<1e-8);
 look.recenter();assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(originalDirection)<1e-8);
 look.setMode('3d');assert.notDeepEqual(camera.position.toArray(),[0,1.6,0]);const distance=look.distance;assert.equal(look.zoom(.8),true);assert.ok(look.distance<distance);
});

test('orientation calibrates the first real sample, handles north wrap, and resets on recenter',()=>{
 const camera=new PerspectiveCamera(),look=createLensViewController(camera);look.setMode('camera');
 assert.equal(look.setOrientation(null),false);assert.equal(look.setOrientation({alpha:null,beta:90,gamma:0}),false);assert.equal(look.orientationActive,false);
 assert.equal(look.setOrientation({alpha:359,beta:90,gamma:0}),true);const first=camera.quaternion.clone();assert.ok(first.angleTo(new Quaternion())<1e-8);
 look.setOrientation({alpha:1,beta:90,gamma:0});assert.ok(Math.abs(camera.quaternion.angleTo(first)-2*Math.PI/180)<1e-8);
 assert.deepEqual(camera.position.toArray(),[0,1.6,0]);look.recenter();assert.ok(camera.quaternion.angleTo(new Quaternion())<1e-8);
 look.setOrientation({alpha:21,beta:90,gamma:0});assert.ok(Math.abs(camera.quaternion.angleTo(new Quaternion())-20*Math.PI/180)<1e-8);
 const beforeStop=camera.getWorldDirection(new Vector3());look.stopOrientation();assert.equal(look.orientationActive,false);assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(beforeStop)<1e-8);
});

test('relative phone orientation preserves arbitrary start tilt and corrects the screen axes',()=>{
 const camera=new PerspectiveCamera(),look=createLensViewController(camera);look.setMode('camera');
 const start={alpha:147,beta:63,gamma:-12,screen:90},next={...start,alpha:177,beta:72};
 look.setOrientation(start);assert.ok(camera.quaternion.angleTo(new Quaternion())<1e-8);look.setOrientation(next);
 const expected=deviceOrientationQuaternion(start).invert().multiply(deviceOrientationQuaternion(next));assert.ok(camera.quaternion.angleTo(expected)<1e-8);
 const upright=deviceOrientationQuaternion({alpha:0,beta:90,gamma:0,screen:0});assert.ok(upright.angleTo(new Quaternion())<1e-8);
 const landscape=deviceOrientationQuaternion({alpha:0,beta:90,gamma:0,screen:90});assert.ok(Math.abs(upright.angleTo(landscape)-Math.PI/2)<1e-8);
 assert.equal(deviceOrientationQuaternion({alpha:0,beta:90,gamma:NaN}),null);
});

test('a placed native world uses metres, remains upright and faces the tracked viewer',()=>{
 const pose=new Matrix4().makeRotationY(.72).setPosition(1,-1.6,-2).toArray(),viewer={x:3,y:0,z:5};
 const matrix=worldPlacementMatrix(pose,viewer),translation=new Vector3(),rotation=new Quaternion(),scale=new Vector3();matrix.decompose(translation,rotation,scale);
 assert.deepEqual(translation.toArray(),[1,-1.6,-2]);assert.ok(scale.distanceTo(new Vector3(1,1,1))<1e-8);
 assert.ok(new Vector3(0,1,0).applyQuaternion(rotation).distanceTo(new Vector3(0,1,0))<1e-8);
 assert.ok(new Vector3(0,0,1).applyQuaternion(rotation).distanceTo(new Vector3(2,0,7).normalize())<1e-8);
 const twoMetreFigure=new Vector3(0,2,0).applyMatrix4(matrix);assert.ok(Math.abs(twoMetreFigure.distanceTo(translation)-2)<1e-8);
 const snapshot=matrix.clone();pose[12]=42;viewer.x=-30;assert.deepEqual(matrix.toArray(),snapshot.toArray(),'A selected pose is a fixed placement, not the next hit-test pose');
});

test('native placement accepts gently sloped ground and rejects walls, ceilings and malformed transforms',()=>{
 assert.ok(horizontalPoseMatrix(identity()));assert.ok(horizontalPoseMatrix(new Matrix4().makeRotationX(20*Math.PI/180).toArray()));
 assert.equal(horizontalPoseMatrix(new Matrix4().makeRotationX(30*Math.PI/180).toArray()),null);
 assert.equal(horizontalPoseMatrix(new Matrix4().makeRotationX(Math.PI/2).toArray()),null);assert.equal(horizontalPoseMatrix(new Matrix4().makeRotationX(Math.PI).toArray()),null);
 const collapsed=identity();collapsed[0]=0;assert.equal(validPoseMatrix(collapsed),null);
 const scaled=identity();scaled[0]=2;assert.equal(validPoseMatrix(scaled),null);
 const perspective=identity();perspective[3]=.1;assert.equal(validPoseMatrix(perspective),null);
 const reflected=identity();reflected[0]=-1;assert.equal(validPoseMatrix(reflected),null);
});

test('XR selects a floor instead of the first wall and clears placement after viewer tracking loss',async()=>{
 const session=new Session(),selections=[],states=[];
 const controller=createXRSessionController({xr:{requestSession:async()=>session},onSelect:value=>selections.push(value),onState:value=>states.push(value.phase)});await controller.start();
 const wall=new Matrix4().makeRotationX(Math.PI/2).toArray(),floor=identity();floor[14]=-3;
 const viewer={x:0,y:1.6,z:0},hits=[wall,floor].map(matrix=>({getPose:()=>({transform:{matrix}})}));
 controller.frame({session,getViewerPose:()=>({transform:{position:viewer}}),getHitTestResults:()=>hits});session.dispatchEvent(new Event('select'));
 assert.equal(selections[0].pose[14],-3);assert.deepEqual(selections[0].viewerPosition,viewer);selections[0].viewerPosition.x=100;
 session.dispatchEvent(new Event('select'));assert.equal(selections[1].viewerPosition.x,0);
 controller.frame({session,getViewerPose:()=>null,getHitTestResults:()=>{throw Error('Tracking was already lost');}});session.dispatchEvent(new Event('select'));
 assert.equal(selections[2].pose,null);assert.equal(selections[2].viewerPosition,null);assert.equal(states.at(-1),'tracking-lost');
 controller.frame({session,getViewerPose:()=>({transform:{position:viewer}}),getHitTestResults:()=>[]});assert.equal(states.at(-1),'searching');await controller.stop();
});

test('a second AR request cannot overlap a pending user permission',async()=>{
 const pending=deferred(),session=new Session();let requests=0;
 const controller=createXRSessionController({xr:{requestSession:()=>{requests++;return pending.promise;}}});
 const started=controller.start();await assert.rejects(controller.start(),/déjà active/);assert.equal(requests,1);
 await controller.stop();pending.resolve(session);assert.equal(await started,false);assert.equal(session.ends,1);
});

test('a hidden native XR session is ended and releases its surface source',async()=>{
 const session=new Session(),controller=createXRSessionController({xr:{requestSession:async()=>session}});await controller.start();
 session.visibilityState='visible-blurred';session.dispatchEvent(new Event('visibilitychange'));assert.equal(controller.active,true);
 session.visibilityState='hidden';session.dispatchEvent(new Event('visibilitychange'));assert.equal(controller.active,false);assert.equal(session.ends,1);assert.equal(session.cancels,1);
 session.dispatchEvent(new Event('visibilitychange'));assert.equal(session.ends,1);
});

test('a native reference-space reset reports fresh placement even when hit testing is already searching',async()=>{
 for(const phaseBeforeReset of ['surface','searching']){
  const session=new Session(),reference=new EventTarget(),selections=[],states=[];let resets=0,placed=false;
  const controller=createXRSessionController({xr:{requestSession:async()=>session},attachSession:()=>reference,
   onReferenceReset:()=>{resets++;placed=false;},onSelect:value=>{selections.push(value);if(value.pose)placed=true;},
   onState:state=>states.push({...state,placed})});
  await controller.start();controller.frame({session,getHitTestResults:()=>[{getPose:()=>({transform:{matrix:identity()}})}]});session.dispatchEvent(new Event('select'));assert.ok(selections[0].pose);assert.equal(placed,true);
  if(phaseBeforeReset==='searching')controller.frame({session,getHitTestResults:()=>[]});
  assert.equal(controller.phase,phaseBeforeReset);const previousEvents=states.length;
  reference.dispatchEvent(new Event('reset'));assert.equal(resets,1);assert.equal(controller.phase,'searching');
  assert.equal(states.length,previousEvents+1,'A reset must notify the UI even if its phase is unchanged');assert.equal(states.at(-1).placed,false);assert.match(states.at(-1).message,/replacer ton monde/);
  session.dispatchEvent(new Event('select'));assert.equal(selections[1].pose,null);
  await controller.stop();reference.dispatchEvent(new Event('reset'));assert.equal(resets,1);
 }
});

test('camera requests a rear 720p video feed without audio and releases all tracks after interruption',async()=>{
 class Track extends EventTarget{stops=0;stop(){this.stops++;}}
 const first=new Track(),second=new Track();let constraints;
 const controller=createLensCameraController({mediaDevices:{getUserMedia:async value=>{constraints=value;return {getTracks:()=>[first,second]};}}});
 await controller.start();assert.equal(constraints.audio,false);assert.deepEqual(constraints.video.facingMode,{ideal:'environment'});
 assert.deepEqual(constraints.video.width,{ideal:1280});assert.deepEqual(constraints.video.height,{ideal:720});assert.equal(constraints.video.frameRate.max,30);
 first.dispatchEvent(new Event('ended'));assert.equal(first.stops,1);assert.equal(second.stops,1);assert.equal(controller.active,false);controller.stop();assert.equal(second.stops,1);
});

test('a refused camera prompt is an error without an active stream and can be retried',async()=>{
 class Track extends EventTarget{stops=0;stop(){this.stops++;}}
 const track=new Track(),states=[];let attempts=0;
 const controller=createLensCameraController({mediaDevices:{getUserMedia:async()=>{if(attempts++===0)throw new DOMException('Permission denied','NotAllowedError');return {getTracks:()=>[track]};}},onState:value=>states.push(value)});
 await assert.rejects(controller.start(),{name:'NotAllowedError'});assert.equal(controller.active,false);assert.equal(states.at(-1),'error');
 assert.equal(await controller.start(),true);assert.equal(controller.active,true);controller.stop();assert.equal(track.stops,1);
});

test('camera cleanup releases other tracks if one device handle throws during stop',async()=>{
 let released=0;const tracks=[{stop(){throw Error('driver ended');}},{stop(){released++;}}];
 const controller=createLensCameraController({mediaDevices:{getUserMedia:async()=>({getTracks:()=>tracks})}});
 await controller.start();assert.doesNotThrow(()=>controller.stop());assert.equal(released,1);assert.equal(controller.active,false);
});

test('an empty or already-ended camera feed never reports itself as active',async()=>{
 for(const tracks of [[],[{readyState:'ended',stop(){}}]]){
  const states=[],streams=[],controller=createLensCameraController({mediaDevices:{getUserMedia:async()=>({getTracks:()=>tracks})},onState:value=>states.push(value),onStream:value=>streams.push(value)});
  await assert.rejects(controller.start(),/vidéo active/);assert.equal(controller.active,false);assert.equal(states.at(-1),'error');assert.equal(streams.some(Boolean),false);
 }
});
