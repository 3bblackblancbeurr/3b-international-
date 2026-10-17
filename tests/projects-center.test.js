import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROJECT_DEFINITIONS,applyProjectAction,createInitialProjectState,createProjectTask,exportProjectBackup,loadProjectState,mergeProjectBackup,parseProjectBackup,projectStorageKey,projectSummary,restoreProjectState,saveProjectState,searchProjectTasks} from '../src/control/projects-model.js';
import {PAGE_HASHES} from '../src/lib/navigation.js';

const start='2026-10-17T12:00:00.000Z',later='2026-10-17T13:00:00.000Z';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('portfolio starts with measurable proposed milestones and no invented completion',()=>{
 const state=createInitialProjectState(start);
 assert.equal(PROJECT_DEFINITIONS.length,12);assert.equal(state.tasks.length,36);
 assert.equal(new Set(state.tasks.map(task=>task.id)).size,36);
 assert.deepEqual(projectSummary(state.tasks),{total:36,done:0,blocked:0,active:0});
 for(const project of PROJECT_DEFINITIONS){assert.ok(Object.hasOwn(PAGE_HASHES,project.route),project.id);assert.equal(projectSummary(state.tasks,project.id).total,3);}
});

test('task editing and status changes survive save, reload and backup transfer',()=>{
 const store=memory();let state=createInitialProjectState(start);
 const draft={...createProjectTask('application',{id:'new-jalon',now:start}),title:'Vérifier la connexion',notes:'Preuve : contrôle Android',owner:'Équipe 3B',dueDate:'2026-10-25',priority:'high'};
 state=applyProjectAction(state,{type:'save',task:draft},later);
 state=applyProjectAction(state,{type:'status',id:draft.id,status:'done'},later);
 state=applyProjectAction(state,{type:'select',projectId:'passport'},later);
 assert.equal(saveProjectState(state,store,'owner-a').ok,true);
 const reloaded=loadProjectState(store,'owner-a').state;
 assert.deepEqual(reloaded,state);assert.equal(projectSummary(reloaded.tasks,'application').done,1);
 assert.deepEqual(parseProjectBackup(exportProjectBackup(state)),state);
 assert.equal(loadProjectState(store,'owner-b').state.tasks.length,36);
 assert.notEqual(projectStorageKey('owner-a'),projectStorageKey('owner-b'));
});

test('editing an open draft does not roll back a separately changed task status',()=>{
 const state=createInitialProjectState(start),draft={...state.tasks[0],title:'Critère précisé'};
 const changed=applyProjectAction(state,{type:'status',id:draft.id,status:'blocked'},later);
 const saved=applyProjectAction(changed,{type:'save',task:draft},later);
 assert.equal(saved.tasks[0].status,'blocked');assert.equal(saved.tasks[0].title,'Critère précisé');
 assert.equal(state.tasks[0].status,'todo');
});

test('search combines words, accents, responsible and notes, then respects project and status filters',()=>{
 let state=createInitialProjectState(start);
 state=applyProjectAction(state,{type:'save',task:{...state.tasks[0],owner:'Élodie',notes:'Contrôle caméra effectué'}},later);
 state=applyProjectAction(state,{type:'status',id:state.tasks[0].id,status:'active'},later);
 assert.equal(searchProjectTasks(state.tasks,{query:'elodie camera',projectId:'application',status:'active'}).length,1);
 assert.equal(searchProjectTasks(state.tasks,{query:'elodie camera',projectId:'passport'}).length,0);
 assert.equal(searchProjectTasks(state.tasks,{query:'elodie',status:'done'}).length,0);
});

test('deletion is immutable and the previous state can be restored for undo',()=>{
 const state=createInitialProjectState(start),deleted=applyProjectAction(state,{type:'delete',id:state.tasks[0].id},later);
 assert.equal(deleted.tasks.length,35);assert.equal(state.tasks.length,36);
 assert.equal(parseProjectBackup(exportProjectBackup(state)).tasks.length,36);
 assert.throws(()=>applyProjectAction(state,{type:'delete',id:'missing'}),/introuvable/);
});

test('backup merge preserves local tasks and keeps the most recent version for each identifier',()=>{
 let local=createInitialProjectState(start),remote=createInitialProjectState(start);
 local=applyProjectAction(local,{type:'save',task:{...createProjectTask('games',{id:'local-only',now:start}),title:'Jalon local'}},later);
 remote=applyProjectAction(remote,{type:'status',id:remote.tasks[0].id,status:'done'},later);
 remote=applyProjectAction(remote,{type:'save',task:{...createProjectTask('sport',{id:'remote-only',now:start}),title:'Jalon importé'}},later);
 const merged=mergeProjectBackup(local,exportProjectBackup(remote),later);
 assert.equal(merged.added,1);assert.equal(merged.updated,1);assert.equal(merged.state.tasks.length,38);
 assert.equal(merged.state.tasks.find(task=>task.id===local.tasks[0].id).status,'done');
 const older=mergeProjectBackup(merged.state,exportProjectBackup(createInitialProjectState(start)),later);
 assert.equal(older.updated,0);assert.equal(older.state.tasks[0].status,'done');
});

test('yesterday’s real backup overrides untouched proposals on a new device today',()=>{
 const yesterday='2026-10-16T15:00:00.000Z';
 const previous=applyProjectAction(createInitialProjectState(yesterday),{type:'status',id:'application-navigation',status:'done'},yesterday);
 const fresh=createInitialProjectState(start),restored=mergeProjectBackup(fresh,exportProjectBackup(previous),later);
 assert.equal(restored.updated,1);
 assert.equal(restored.state.tasks.find(task=>task.id==='application-navigation').status,'done');
 assert.equal(createProjectTask('application',{id:'real-new-task',now:start}).updatedAt,start);
});

test('undo is a new edit of affected tasks and an earlier backup cannot reverse it',()=>{
 const snapshot=createInitialProjectState(start),changed=applyProjectAction(snapshot,{type:'status',id:'application-navigation',status:'done'},later);
 const undoTime='2026-10-17T14:00:00.000Z',restored=restoreProjectState(changed,snapshot,undoTime);
 const affected=restored.tasks.find(task=>task.id==='application-navigation');
 assert.equal(affected.status,'todo');assert.equal(affected.updatedAt,undoTime);
 assert.equal(restored.tasks[1].updatedAt,changed.tasks[1].updatedAt);
 assert.equal(restored.updatedAt,undoTime);
 const reimported=mergeProjectBackup(restored,exportProjectBackup(changed),'2026-10-17T15:00:00.000Z');
 assert.equal(reimported.updated,0);assert.equal(reimported.state.tasks[0].status,'todo');
 assert.equal(changed.tasks[0].status,'done');
 const deleted=applyProjectAction(snapshot,{type:'delete',id:'application-navigation'},later);
 assert.equal(restoreProjectState(deleted,snapshot,undoTime).tasks[0].updatedAt,undoTime);
});

test('invalid backups and cross-project identity collisions fail without mutating the portfolio',()=>{
 const state=createInitialProjectState(start);
 assert.throws(()=>parseProjectBackup('{'),/illisible/);
 assert.throws(()=>parseProjectBackup({...state,version:100}),/version 1/);
 assert.throws(()=>parseProjectBackup({...state,tasks:[state.tasks[0],state.tasks[0]]}),/double/);
 for(const task of [{...state.tasks[0],id:42},{...state.tasks[0],status:'published'},{...state.tasks[0],dueDate:'2026-02-31'},{...state.tasks[0],dueDate:'2026-99-01'},{...state.tasks[0],projectId:'unknown'}])assert.throws(()=>parseProjectBackup({...state,tasks:[task]}));
 assert.throws(()=>mergeProjectBackup(state,{...state,tasks:[{...state.tasks[0],projectId:'shop',updatedAt:later}]}),/autre projet/);
 assert.throws(()=>applyProjectAction(state,{type:'save',task:{...createProjectTask('application',{id:'empty',now:start}),title:'  '}}),/titre/);
 assert.equal(state.tasks.length,36);assert.equal(state.tasks[0].status,'todo');
});

test('bounded imports reject excessive tasks and ignore unknown data fields',()=>{
 const state=createInitialProjectState(start);
 assert.throws(()=>parseProjectBackup({...state,tasks:Array.from({length:301},(_,i)=>({...state.tasks[0],id:'task-'+i}))}),/300/);
 const parsed=parseProjectBackup({...state,token:'not-exported',tasks:[{...state.tasks[0],script:'not-exported'}]});
 assert.equal(parsed.token,undefined);assert.equal(parsed.tasks[0].script,undefined);
});

test('corrupt or unavailable local storage is recoverable and never claims successful persistence',()=>{
 const store=memory();store.setItem(projectStorageKey('owner'),'{broken');
 const loaded=loadProjectState(store,'owner');assert.match(loaded.notice,/invalide/);
 assert.equal(store.getItem(projectStorageKey('owner')),'{broken');
 assert.equal(saveProjectState(loaded.state,store,'owner').ok,true);
 assert.equal(store.getItem(projectStorageKey('owner')+':recovery'),'{broken');
 const failing={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
 assert.equal(loadProjectState(failing).state.tasks.length,36);
 assert.equal(saveProjectState(loaded.state,failing).ok,false);
});

test('project planning is mounted only after the server has verified the current owner',()=>{
 const source=readFileSync(new URL('../src/control/ProjectsCenterPanel.jsx',import.meta.url),'utf8');
 assert.match(source,/controlCenterRequest\('status'\)/);
 assert.match(source,/verifiedOwner!==ownerId/);
 assert.match(source,/key=\{ownerId\}/);
 assert.match(source,/loadProjectState\(undefined,ownerId\)/);
 assert.ok(!source.includes('<button'));
});
