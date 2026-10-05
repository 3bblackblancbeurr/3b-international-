import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DIRECTOR_ACTIONS,directorCapabilities,lockedDraft,validateLockedManifest} from '../src/destin/lockedPolicy.js';
import {newManifest} from '../src/destin/model.js';
import {handleDestin} from '../supabase/functions/destin-api/handler.ts';
const user='11111111-1111-4111-8111-111111111111';
const ready={allowed:true,code:'ready',emailConfirmed:true,passportActive:true,identityVerified:true,personBound:true};
const unverified={...ready,allowed:false,code:'identity_required',identityVerified:false,personBound:false};
const film=()=>{const m=lockedDraft(newManifest());m.nodes.forEach((n,i)=>n.src=`storage:${user}/22222222-2222-4222-8222-${String(i+1).padStart(12,'0')}.mp4`);return m;};
const send=(data,status=200)=>({data,status});
function database({owner=true,access=unverified,proofError=false,result={stories:[]}}={}){
 const calls=[];
 return {calls,from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='member_profiles'?{passport_state:'active'}:{owner_user_id:owner?user:'other-account'},error:null})};},
  rpc:async(name,args)=>{calls.push([name,args]);return name==='passport_destin_access_server_v1'?{data:access,error:proofError?{message:'private detail'}:null}:{data:result,error:null};},
  storage:{from:()=>({createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'https://media.invalid/'+path})),error:null})})}};
}
test('director capabilities reject truthy client-like values',()=>{for(const owner of [false,'true',1,{},null])assert.equal(directorCapabilities(owner).studio,false);assert.equal(directorCapabilities(true).allBranchesPreview,true);assert.equal(directorCapabilities(true).previewRewards,false);});
test('creator actions exclude all consequential spectator operations',()=>{for(const name of ['start','choose','finish','claim','vote','resume','checkpoint'])assert.equal(DIRECTOR_ACTIONS.has(name),false);assert.equal(DIRECTOR_ACTIONS.has('preview'),true);});
test('Director keeps the Studio without a civil identity proof',async()=>{const db=database();const r=await handleDestin(db,user,{action:'editor'},send);assert.equal(r.status,200);assert.equal(r.data.directorAccess.studio,true);assert.equal(db.calls.some(([name])=>name==='passport_destin_access_server_v1'),false);});
test('Director status does not manufacture a verified identity',async()=>{const r=await handleDestin(database(),user,{action:'status'},send);assert.equal(r.data.owner,true);assert.equal(r.data.directorAccess.studio,true);assert.equal(r.data.passportAccess.identityVerified,false);assert.equal(r.data.passportAccess.allowed,false);});
test('identity service failure does not lock the Director out of the catalogue',async()=>{const r=await handleDestin(database({proofError:true}),user,{action:'catalog'},send);assert.equal(r.status,200);assert.equal(r.data.owner,true);assert.equal(r.data.passportAccess.code,'unavailable');});
test('forged owner fields never open the Studio to another account',async()=>{const db=database({owner:false});const r=await handleDestin(db,user,{action:'editor',owner:true,role:'director',p_owner:true},send);assert.equal(r.status,403);assert.equal(db.calls.length,0);});
test('even Director cannot issue an unverified spectator choice',async()=>{const db=database();const r=await handleDestin(db,user,{action:'choose',owner:true},send);assert.equal(r.status,403);assert.equal(db.calls.some(([name])=>name==='destin_command_server'),false);});
test('private distinct scenes publish; a shared video cannot',()=>{assert.deepEqual(validateLockedManifest(film()),[]);const m=film();m.nodes[1].src=m.nodes[0].src;assert.ok(validateLockedManifest(m).some(e=>e.includes('distinct')));});
test('public video and non-video object cannot publish a locked branch',()=>{for(const src of ['https://media.invalid/video.mp4',`storage:${user}/22222222-2222-4222-8222-222222222222.jpg`]){const m=film();m.nodes[0].src=src;assert.ok(validateLockedManifest(m).length);}});
test('requiring a different ending is rejected before publication',()=>{const m=film();m.nodes[0].choices[1].requiresEnding='porte';assert.ok(validateLockedManifest(m).some(e=>e.includes('parcours unique')));});
test('imported drafts lose automatic decisions without changing the input',()=>{const m=newManifest();const locked=lockedDraft(m);assert.equal(m.nodes[0].timeout,5);assert.ok(locked.nodes.every(n=>n.timeout===0 && n.defaultChoice===''));});
test('an old full-story backend response fails closed',async()=>{const m=film();await assert.rejects(()=>handleDestin(database({access:ready,result:{manifest:m,run:{node_id:'intro'}}}),user,{action:'resume',runId:user},send),/private scene scope invalid/);});
test('current scene signing never includes another branch',async()=>{const m=film(),scene=m.nodes[0];const r=await handleDestin(database({access:ready,result:{manifest:{...m,nodes:[scene]},run:{node_id:scene.id}}}),user,{action:'resume',runId:user},send);assert.deepEqual(Object.keys(r.data.media),[scene.src]);});
test('real playback has confirmation, no alternative warmup and preview-only replay',()=>{const s=fs.readFileSync('src/destin/DestinPlayer.jsx','utf8');assert.ok(s.includes('<DestinConfirmation'));assert.ok(s.includes('seconds={preview?node.timeout:0}'));assert.ok(s.includes('{preview && <button className="destin-primary" onClick={onRestart}'));assert.ok(!s.includes('const warmed'));});
test('catalogue exposes no reset and no exploration of another real ending',()=>{const s=fs.readFileSync('src/destin/DestinPage.jsx','utf8');assert.ok(!s.includes('restart'));assert.ok(!s.includes('Explorer à nouveau'));assert.ok(!s.includes('Recommencer '));});
