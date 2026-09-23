import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotGate,watchSession} from '../src/loyalty/session-state.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function authFixture(){
 const initial=deferred();let notify,stopped=false;
 return{initial,emit:session=>notify('SIGNED_IN',session),get stopped(){return stopped;},auth:{getSession:()=>initial.promise,onAuthStateChange:callback=>{notify=callback;return{data:{subscription:{unsubscribe:()=>{stopped=true;}}}};}}};
}

test('a live authentication change wins over a delayed initial session',async()=>{
 const fixture=authFixture(),seen=[];
 const {stop}=watchSession(fixture.auth,session=>seen.push(session),assert.fail);
 fixture.emit({user:{id:'new-user'}});
 fixture.initial.resolve({data:{session:{user:{id:'old-user'}}}});
 await flush();
 assert.deepEqual(seen,[{user:{id:'new-user'}}]);
 stop();assert.equal(fixture.stopped,true);
});

test('initial session read failures notify the UI instead of leaving it loading forever',async()=>{
 for(const rejected of [true,false]){
  const fixture=authFixture(),failures=[];
  const {stop}=watchSession(fixture.auth,()=>assert.fail('Unexpected session'),error=>failures.push(error.message));
  const error=new Error('Storage inaccessible');
  if(rejected)fixture.initial.reject(error);else fixture.initial.resolve({data:{session:null},error});
  await flush();assert.deepEqual(failures,['Storage inaccessible']);stop();
 }
});

test('synchronous session storage exceptions report failure immediately and remain retryable',async()=>{
 const fixture=authFixture(),failures=[],sessions=[];
 fixture.auth.getSession=()=>{throw new Error('Synchronous storage failure');};
 const watcher=watchSession(fixture.auth,session=>sessions.push(session),error=>failures.push(error.message));
 assert.deepEqual(failures,['Synchronous storage failure']);
 fixture.auth.getSession=async()=>({data:{session:null}});
 await watcher.refresh();
 assert.deepEqual(sessions,[null]);
 assert.deepEqual(failures,['Synchronous storage failure']);
 watcher.stop();
});

test('a rejected initial read cannot replace or report an error over a newer auth event',async()=>{
 const fixture=authFixture(),seen=[];
 const {stop}=watchSession(fixture.auth,session=>seen.push(session),()=>assert.fail('Obsolete auth error'));
 fixture.emit({user:{id:'current-user'}});
 fixture.initial.reject(new Error('Old storage request failed'));
 await flush();
 assert.deepEqual(seen,[{user:{id:'current-user'}}]);
 stop();
});

test('unmounting cancels initial session results and error callbacks',async()=>{
 for(const rejected of [true,false]){
  const fixture=authFixture();
  const {stop}=watchSession(fixture.auth,()=>assert.fail('Unmounted session'),()=>assert.fail('Unmounted error'));
  stop();
  if(rejected)fixture.initial.reject(new Error('late error'));else fixture.initial.resolve({data:{session:null}});
  await flush();
 }
});

test('retry reads the session again after an initial failure without subscribing twice',async()=>{
 const fixture=authFixture(),seen=[],failures=[];
 const watcher=watchSession(fixture.auth,session=>seen.push(session),error=>failures.push(error.message));
 fixture.initial.reject(new Error('Temporary storage failure'));await flush();
 const recovered={user:{id:'recovered-user'}};let retried=0;
 fixture.auth.getSession=async()=>{retried+=1;return{data:{session:recovered}};};
 assert.equal(await watcher.refresh(),recovered);
 assert.equal(retried,1);
 assert.deepEqual(seen,[recovered]);
 assert.deepEqual(failures,['Temporary storage failure']);
 fixture.emit(null);assert.deepEqual(seen,[recovered,null]);
 watcher.stop();
});

test('a retry cannot overwrite a newer auth event with a stale session or error',async()=>{
 for(const rejected of [true,false]){
  const fixture=authFixture(),seen=[],failures=[];
  const watcher=watchSession(fixture.auth,session=>seen.push(session),error=>failures.push(error.message));
  fixture.initial.reject(new Error('Initial failure'));await flush();
  const retry=deferred();fixture.auth.getSession=()=>retry.promise;
  const pending=watcher.refresh();fixture.emit({user:{id:'new-user'}});
  if(rejected)retry.reject(new Error('Old retry failed'));else retry.resolve({data:{session:{user:{id:'old-user'}}}});
  await pending;
  assert.deepEqual(seen,[{user:{id:'new-user'}}]);
  assert.deepEqual(failures,['Initial failure']);watcher.stop();
 }
});

test('only the latest session retry is accepted and cleanup blocks later retries',async()=>{
 const fixture=authFixture(),seen=[];
 const watcher=watchSession(fixture.auth,session=>seen.push(session),()=>{});
 fixture.initial.reject(new Error('Initial failure'));await flush();
 const older=deferred(),newer=deferred();let reads=0;
 fixture.auth.getSession=()=>++reads===1?older.promise:newer.promise;
 const first=watcher.refresh(),second=watcher.refresh();
 newer.resolve({data:{session:null}});await second;
 older.resolve({data:{session:{user:{id:'stale-user'}}}});await first;
 assert.deepEqual(seen,[null]);
 watcher.stop();await watcher.refresh();assert.equal(reads,2);
});

test('an old snapshot cannot replace a newer snapshot or an accepted reward',()=>{
 const gate=createSnapshotGate();gate.setUser('alice');
 const first=gate.begin(),second=gate.begin();
 assert.equal(gate.isCurrent(first),false);
 assert.equal(gate.isCurrent(second),true);
 assert.equal(gate.accept({profile:{user_id:'alice',points:12}},gate.accountTicket()),true);
 assert.equal(gate.isCurrent(second),false);
});

test('switching accounts rejects both old snapshots and old mutation callbacks',()=>{
 const gate=createSnapshotGate();gate.setUser('alice');
 const snapshot=gate.begin(),owner=gate.accountTicket();
 gate.setUser('bob');
 assert.equal(gate.isCurrent(snapshot),false);
 assert.equal(gate.accept({profile:{user_id:'alice'}},owner),false);
 assert.equal(gate.accept({profile:{user_id:'bob'}},owner),false);
 gate.setUser('alice');
 assert.equal(gate.isCurrent(snapshot),false);
 assert.equal(gate.accept({profile:{user_id:'alice'}},owner),false);
 assert.equal(gate.accept({profile:{user_id:'alice'}},gate.accountTicket()),true);
});

test('logout, cleanup and owner mismatches cannot grant an active profile',()=>{
 const gate=createSnapshotGate();gate.setUser('alice');
 const owner=gate.accountTicket();
 assert.equal(gate.accept({profile:{user_id:'bob'}},owner),false);
 gate.invalidate();assert.equal(gate.accept({profile:{user_id:'alice'}},owner),false);
 gate.setUser(null);const guest=gate.begin();
 assert.equal(gate.isCurrent(guest),false);
 assert.equal(gate.accept({profile:{user_id:null}},guest),false);
});
