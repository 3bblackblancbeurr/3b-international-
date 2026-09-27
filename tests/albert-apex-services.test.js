import test from 'node:test';
import assert from 'node:assert/strict';
import {
 APEX_TYPED_ACTIONS,typedAction,capabilityRegistry,ambientInbox,deliveryFor,shouldInterrupt,
 createSkillManifest,qualifySkill,nextSkillVersion,sessionSnapshot,distillSession,
 assetProvenance,modelQualification,impactReport
} from '../src/control/albert-apex-services.js';

test('Typed actions have explicit permission and unknown actions fail closed',()=>{
 const read=typedAction('read',{path:'x'});
 const publish=typedAction('publish',{target:'3B'});
 assert.equal(read.permission,0);
 assert.equal(read.approvalRequired,false);
 assert.equal(publish.permission,3);
 assert.equal(publish.approvalRequired,true);
 assert.throws(()=>typedAction('shell_anything'),/inconnue/);
 assert.equal(APEX_TYPED_ACTIONS.payment.reversible,false);
});

test('Capability registry separates PC connectivity from verified ALBERT runtime',()=>{
 const offline=capabilityRegistry({online:true,localRuntime:false,albertRuntime:false,providers:{google:{state:'live'},stripe:{state:'setup_required'}}});
 assert.equal(offline.find(x=>x.id==='google').state,'live');
 assert.equal(offline.find(x=>x.id==='stripe').state,'setup_required');
 assert.equal(offline.find(x=>x.id==='localRuntime').state,'offline');
 assert.equal(offline.find(x=>x.id==='pcControl').state,'offline');
 assert.equal(offline.find(x=>x.id==='internet').state,'live');
 const pcOnly=capabilityRegistry({online:true,localRuntime:true,albertRuntime:false});
 assert.equal(pcOnly.find(x=>x.id==='localRuntime').state,'unavailable');
 assert.equal(pcOnly.find(x=>x.id==='pcControl').state,'available');
 const verified=capabilityRegistry({online:true,localRuntime:true,albertRuntime:true});
 assert.equal(verified.find(x=>x.id==='localRuntime').state,'live');
});

test('Ambient inbox deduplicates events and applies interruption policy',()=>{
 const events=[
  {id:'a',type:'payment.failed',priority:'critical',payload:{}},
  {id:'a',type:'payment.failed',priority:'critical',payload:{}},
  {id:'b',type:'mail.received',priority:'normal',payload:{}}
 ];
 const inbox=ambientInbox(events);
 assert.equal(inbox.length,2);
 assert.equal(deliveryFor(inbox[0]),'voice+visual');
 assert.equal(shouldInterrupt(inbox[0],{quiet:true}),true);
 assert.equal(shouldInterrupt(inbox[1],{sessionBusy:true}),false);
});

test('Skill compiler versions and trust require measured success',()=>{
 const skill=createSkillManifest({id:'brief',name:'Brief',version:'1.0.0',actions:['read','send_message','unknown'],tests:['works']});
 assert.deepEqual(skill.actions,['read','send_message']);
 assert.equal(qualifySkill(skill,{passed:4,failed:0}).trust,'experimental');
 assert.equal(qualifySkill(skill,{passed:20,failed:0}).trust,'qualified');
 assert.equal(qualifySkill(skill,{passed:100,failed:0}).trust,'trusted');
 assert.equal(nextSkillVersion('1.2.3','minor'),'1.3.0');
});

test('Session snapshots persist only bounded resumable state and distill outcomes',()=>{
 const state={
  mode:'AUTO',resourceProfile:'NORMAL',session:{id:'s'},
  tasks:[
   {id:'1',intent:'ok',status:'verified',evidence:{id:'e1'}},
   {id:'2',intent:'bad',status:'failed',error:'boom'},
   {id:'3',intent:'later',status:'running',progress:{phase:'PLAN'},spec:{},graph:{}}
  ],needYou:[{id:'n'}]
 };
 const snapshot=sessionSnapshot(state);
 assert.deepEqual(snapshot.activeTasks.map(t=>t.id),['3']);
 const distilled=distillSession(state);
 assert.deepEqual(distilled.summary,{verified:1,failed:1,pending:1,approvals:1});
 assert.equal(distilled.resume[0].phase,'PLAN');
});

test('Creative provenance, model qualification and impact reports stay inspectable',()=>{
 const asset=assetProvenance({source:'generated',model:'m',project:'3B',parentIds:['a']});
 assert.equal(asset.source,'generated');
 const model=modelQualification({model:'x',attempts:10,usable:9,firstTryRate:.8,quality:80,latencyMs:50,costPerRun:.1});
 assert.equal(model.qualified,true);
 assert.equal(model.score>0,true);
 const impact=impactReport({files:['a','b'],systems:['auth'],external:['publish'],production:true});
 assert.equal(impact.production,true);
 assert.equal(['medium','high'].includes(impact.level),true);
});
