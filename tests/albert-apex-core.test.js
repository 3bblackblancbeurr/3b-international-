import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ALBERT_OPERATION_MODES,ALBERT_RESOURCE_PROFILES,ALBERT_PHASES,
 createAlbertConstitution,compileAlbertSpec,compileAlbertTaskGraph,
 runnableAlbertTasks,transitionAlbertTask,advanceAlbertGraph,verifyAlbertGraphPhase,actionRisk,permissionDecision,
 routeAlbertModel,resourcePolicy,inspectAlbertStrategy,evaluateCompletion,
 createEvidenceBundle,eventPriority,createApexState,normalizeApexState
} from '../src/control/albert-apex-core.js';

test('APEX exposes the four execution modes and three resource profiles',()=>{
 assert.deepEqual(ALBERT_OPERATION_MODES,['AUTO','LOCAL','HYBRID','INTERNET']);
 assert.deepEqual(ALBERT_RESOURCE_PROFILES,['ECO','NORMAL','APEX']);
 assert.deepEqual(ALBERT_PHASES,['INTENT','ASSESS','PLAN','EXECUTE','REVIEW','VERIFY','EVIDENCE']);
});

test('Constitution, spec and task graph create a deterministic execution spine',()=>{
 const constitution=createAlbertConstitution({project:'3B'});
 const spec=compileAlbertSpec('Corrige le bug du bouton puis teste le résultat',{project:'3B',constitution});
 assert.equal(spec.kind,'bug');
 assert.equal(spec.frozen,true);
 assert.ok(spec.acceptance.some(rule=>/non-régression/i.test(rule)));
 const graph=compileAlbertTaskGraph(spec);
 assert.equal(graph.tasks.length,7);
 assert.deepEqual(runnableAlbertTasks(graph).map(t=>t.key),['understand']);
 const first=transitionAlbertTask(graph,graph.tasks[0].id,'verified');
 assert.deepEqual(runnableAlbertTasks(first).map(t=>t.key),['assess']);
});

test('Cancelled or skipped phases never unlock the next APEX phase',()=>{
 const spec=compileAlbertSpec('Prépare une action');
 const graph=compileAlbertTaskGraph(spec);
 const cancelled=transitionAlbertTask(graph,graph.tasks[0].id,'cancelled');
 assert.deepEqual(runnableAlbertTasks(cancelled),[]);
 const skipped=advanceAlbertGraph(graph,'EXECUTE');
 assert.equal(skipped.tasks.find(t=>t.phase==='EXECUTE').status,'queued');
});

test('APEX phase progression is sequential and only evidence closes the graph',()=>{
 const spec=compileAlbertSpec('Prépare une action');
 let graph=compileAlbertTaskGraph(spec);
 for(const phase of ALBERT_PHASES)graph=advanceAlbertGraph(graph,phase);
 assert.equal(graph.tasks.slice(0,-1).every(t=>t.status==='verified'),true);
 assert.equal(graph.tasks.at(-1).status,'running');
 assert.equal(evaluateCompletion({spec,graph,evidence:{executed:true,tested:true,verified:true,reversible:true,documented:true}}).complete,false);
 graph=verifyAlbertGraphPhase(graph,'EVIDENCE',['preuve']);
 assert.equal(evaluateCompletion({spec,graph,evidence:{executed:true,tested:true,verified:true,reversible:true,documented:true}}).complete,true);
});

test('Permission broker fails safe for unknown and irreversible actions',()=>{
 assert.equal(actionRisk({type:'read'}).level,0);
 assert.equal(actionRisk({type:'publish'}).approval,true);
 assert.equal(actionRisk({type:'payment'}).level,4);
 assert.equal(permissionDecision({type:'open_app'}).allowed,true);
 assert.equal(permissionDecision({type:'publish'}).allowed,false);
 assert.equal(permissionDecision({type:'publish'},{grants:['publish']}).allowed,true);
 assert.equal(permissionDecision({type:'unknown_new_action'}).approvalRequired,true);
});

test('Model router respects strict/local modes before convenience',()=>{
 const available=[
  {name:'local-code',local:true,available:true,capabilities:['code','chat']},
  {name:'cloud-code',local:false,available:true,capabilities:['code','reasoning']}
 ];
 assert.equal(routeAlbertModel({kind:'build',mode:'LOCAL',available}).model.name,'local-code');
 assert.equal(routeAlbertModel({kind:'build',mode:'INTERNET',available}).model.name,'cloud-code');
 assert.equal(routeAlbertModel({kind:'build',mode:'AUTO',privacy:'strict',available}).route,'local');
});

test('Resource profiles bound parallel work instead of pretending capacity',()=>{
 assert.equal(resourcePolicy('ECO').maxParallel,1);
 assert.equal(resourcePolicy('NORMAL').maxParallel,2);
 assert.equal(resourcePolicy('APEX').maxParallel,4);
});

test('Metacognitive supervisor detects repeated intentions and failure streaks',()=>{
 const repeated=[{intent:'Fais X',status:'verified'},{intent:'Fais X',status:'failed'}];
 assert.equal(inspectAlbertStrategy(repeated,'Fais X').switchStrategy,true);
 const failures=[1,2,3].map(i=>({intent:'t'+i,status:'failed'}));
 assert.equal(inspectAlbertStrategy(failures,'Autre tâche').state,'degraded');
});

test('Completion contract refuses a success claim without complete evidence',()=>{
 const spec=compileAlbertSpec('Construis un module');
 let graph=compileAlbertTaskGraph(spec);
 graph={...graph,tasks:graph.tasks.map(t=>({...t,status:'verified'}))};
 assert.equal(evaluateCompletion({spec,graph,evidence:{executed:true,tested:true,verified:false,documented:true,reversible:true}}).complete,false);
 assert.equal(evaluateCompletion({spec,graph,evidence:{executed:true,tested:true,verified:true,documented:true,reversible:true}}).state,'VERIFIED');
 const evidence=createEvidenceBundle({files:['a.js'],tests:['node --test'],notes:'ok'});
 assert.deepEqual(evidence.files,['a.js']);
});

test('Event priority surfaces critical external changes without making all events noisy',()=>{
 assert.equal(eventPriority('payment.failed'),'critical');
 assert.equal(eventPriority('approval.required'),'attention');
 assert.equal(eventPriority('mail.received'),'normal');
 assert.equal(eventPriority('telemetry.updated'),'quiet');
});

test('Persisted APEX state is normalized and bounded',()=>{
 const base=createApexState();
 const raw={...base,mode:'INVALID',resourceProfile:'APEX',tasks:Array(100).fill({id:'x'}),events:Array(150).fill({id:'e'}),needYou:Array(60).fill({id:'n'})};
 const clean=normalizeApexState(raw);
 assert.equal(clean.mode,'AUTO');
 assert.equal(clean.resourceProfile,'APEX');
 assert.equal(clean.tasks.length,60);
 assert.equal(clean.events.length,100);
 assert.equal(clean.needYou.length,30);
});
