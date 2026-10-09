import test from 'node:test';
import assert from 'node:assert/strict';
import {createXRSessionController,createLensCameraController,detectARSupport,validPoseMatrix} from '../src/world/invisible/xr-session.js';

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
 const session=new Session(),poses=[],selections=[],states=[];let requested;
 const controller=createXRSessionController({xr:{requestSession:async(mode,options)=>{requested={mode,options};return session;}},overlayRoot:{},attachSession:async()=>({type:'renderer-local'}),onPose:pose=>poses.push(pose),onSelect:event=>selections.push(event),onState:state=>states.push(state.phase)});
 assert.equal(await controller.start(),true);assert.equal(requested.mode,'immersive-ar');assert.deepEqual(requested.options.requiredFeatures,['hit-test','local']);assert.deepEqual(requested.options.optionalFeatures,['dom-overlay']);
 const matrix=identity();matrix[12]=1.25;let poseSpace;
 controller.frame({session,getHitTestResults:source=>{assert.ok(source);return [{getPose:space=>{poseSpace=space;return {transform:{matrix}};}}];}});
 assert.equal(poseSpace.type,'renderer-local');assert.equal(poses.at(-1)[12],1.25);assert.equal(selections.length,0);
 matrix[12]=9;session.dispatchEvent(new Event('select'));assert.equal(selections[0].pose[12],1.25);
 controller.frame({session,getHitTestResults:()=>[]});session.dispatchEvent(new Event('select'));assert.equal(selections[1].pose,null);
 await controller.stop();assert.equal(session.ends,1);assert.equal(session.cancels,1);assert.equal(controller.active,false);
 session.dispatchEvent(new Event('select'));assert.equal(selections.length,2);assert.ok(states.includes('surface'));
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
