import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMemberSaveStore} from '../src/games/memberSave.js';
import {freshProgress,mergeGameProgress,recordGame} from '../src/games/save.js';

const user={id:'123e4567-e89b-42d3-a456-426614174000'};
const memoryStorage=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};};
const ids=(seed=0)=>{let value=seed;return()=>`00000000-0000-4000-8000-${String(++value).padStart(12,'0')}`;};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const cityCheckpoint=(progress,turn)=>({...structuredClone(progress),cities:{world:{0:{board:Array(49).fill(null),hand:Array.from({length:4},()=>({type:'house',rot:0})),turn,score:turn}},countryIndex:0,completed:[]}});
const cachedProgress=storage=>JSON.parse(storage.getItem('3b_arcade_account_'+user.id));

function casServer(){
 let revision=0,data=null,dropAfterCommit=false;
 const receipts=new Map(),requests=[];
 return{
  get revision(){return revision;},get data(){return data;},get requests(){return requests;},
  loseNextCommitResponse(){dropAfterCommit=true;},
  async request(action,body,id){
   assert.equal(id,user.id);requests.push({action,body:structuredClone(body)});
   if(action==='game-save-load')return{save:data?{data:structuredClone(data),revision,updatedAt:'2026-10-02T12:00:00Z'}:null};
   assert.equal(action,'game-save-sync');
   if(receipts.has(body.operationId))return{ok:true,idempotent:true,conflict:false,accepted_revision:receipts.get(body.operationId),revision,data:structuredClone(data),updated_at:'2026-10-02T12:00:00Z'};
   if(body.baseRevision!==revision)return{ok:false,idempotent:false,conflict:true,revision,data:structuredClone(data),updated_at:'2026-10-02T12:00:00Z'};
   revision+=1;data=structuredClone(body.data);receipts.set(body.operationId,revision);
   if(dropAfterCommit){dropAfterCommit=false;throw Error('response lost');}
   return{ok:true,idempotent:false,conflict:false,accepted_revision:revision,revision,data:structuredClone(data),updated_at:'2026-10-02T12:00:00Z'};
  }
 };
}

const store=(server,storage,createOperationId=ids())=>createMemberSaveStore({
 request:server.request.bind(server),getStorage:()=>storage,createOperationId,
 guestLoad:async()=>({data:freshProgress(),online:true,message:'guest'}),guestSave:async()=> 'guest'
});

test('three-way merge preserves concurrent additive records and strongest milestones',()=>{
 const base=freshProgress();
 const local=recordGame(base,'arena',{score:100,won:true,guardians:2,floor:3});
 const remote=recordGame(base,'arena',{score:240,won:false,guardians:1,floor:8});
 const merged=mergeGameProgress(base,local,remote);
 assert.deepEqual(merged.records.arena,{best:240,plays:2,wins:1,guardians:2,floor:8});
});

test('three-way merge keeps city work made in different countries',()=>{
 const base=freshProgress(),city=seed=>({board:Array(49).fill(null),hand:Array.from({length:4},()=>({type:'house',rot:0})),turn:seed,score:seed});
 base.cities={world:{},countryIndex:0,completed:[]};
 const local=structuredClone(base),remote=structuredClone(base);
 local.cities={world:{0:city(2)},countryIndex:0,completed:[0]};
 remote.cities={world:{1:city(3)},countryIndex:1,completed:[1]};
 const merged=mergeGameProgress(base,local,remote);
 assert.deepEqual(merged.cities.completed,[0,1]);
 assert.equal(merged.cities.world[0].turn,2);
 assert.equal(merged.cities.world[1].turn,3);
});

test('two devices rebase on a CAS conflict without losing either completed game',async()=>{
 const server=casServer(),storageA=memoryStorage(),storageB=memoryStorage();
 const a=store(server,storageA,ids(0)),b=store(server,storageB,ids(100));
 const [loadedA,loadedB]=await Promise.all([a.loadGameProgress(user),b.loadGameProgress(user)]);
 const progressA=recordGame(loadedA.data,'arena',{score:100,won:true,guardians:2});
 const progressB=recordGame(loadedB.data,'arena',{score:240,won:false,guardians:1});
 await a.saveGameProgress(progressA,user);
 let reconciled;
 await b.saveGameProgress(progressB,user,value=>{reconciled=value;});
 assert.equal(server.revision,2);
 assert.deepEqual(server.data.records.arena,{best:240,plays:2,wins:1,guardians:2,floor:0});
 assert.deepEqual(reconciled,server.data);
 assert.ok(server.requests.some(call=>call.action==='game-save-sync'&&call.body.baseRevision===0));
 assert.ok(server.requests.some(call=>call.action==='game-save-sync'&&call.body.baseRevision===1));
});

test('rapid checkpoints coalesce to the newest cumulative snapshot',async()=>{
 const server=casServer(),client=store(server,memoryStorage());
 const loaded=await client.loadGameProgress(user);
 const first=recordGame(loaded.data,'arena',{score:40,won:false});
 const second=recordGame(first,'arena',{score:80,won:true});
 await Promise.all([client.saveGameProgress(first,user),client.saveGameProgress(second,user)]);
 assert.equal(server.revision,1);
 assert.equal(server.data.records.arena.plays,2);
 assert.equal(server.data.records.arena.wins,1);
 assert.equal(server.data.records.arena.best,80);
});

test('a lost response is retried with the same receipt and never duplicates progress',async()=>{
 const server=casServer(),storage=memoryStorage(),first=store(server,storage);
 const loaded=await first.loadGameProgress(user),progress=recordGame(loaded.data,'arena',{score:90,won:true});
 server.loseNextCommitResponse();
 assert.match(await first.saveGameProgress(progress,user),/synchronisation en attente/);
 assert.equal(server.revision,1);

 const recovered=await store(server,storage).loadGameProgress(user);
 assert.equal(recovered.online,true);
 assert.equal(recovered.data.records.arena.plays,1);
 assert.equal(recovered.data.records.arena.wins,1);
 assert.equal(server.revision,1,'idempotent replay must not create a second revision');
 const cached=JSON.parse(storage.getItem('3b_arcade_account_'+user.id));
 assert.equal(cached.dirty,false);assert.equal(cached.pending,null);
});

test('a checkpoint arriving during an in-flight write does not count the earlier run twice',async()=>{
 const server=casServer();let release,started;
 const blocked=new Promise(resolve=>{release=resolve;});
 const entered=new Promise(resolve=>{started=resolve;});
 const request=server.request.bind(server);let writes=0;
 server.request=async(...args)=>{
  if(args[0]==='game-save-sync'&&++writes===1){started();await blocked;}
  return request(...args);
 };
 const client=store(server,memoryStorage()),loaded=await client.loadGameProgress(user);
 const first=recordGame(loaded.data,'arena',{score:40,won:true});
 const pending=client.saveGameProgress(first,user);await entered;
 const second=recordGame(first,'arena',{score:80,won:true});
 const next=client.saveGameProgress(second,user);release();await Promise.all([pending,next]);
 assert.equal(server.data.records.arena.plays,2);
 assert.equal(server.data.records.arena.wins,2);
});

test('a newer checkpoint after a lost response only adds the unconfirmed run',async()=>{
 const server=casServer(),client=store(server,memoryStorage());
 const loaded=await client.loadGameProgress(user);
 const first=recordGame(loaded.data,'arena',{score:40,won:true});
 server.loseNextCommitResponse();await client.saveGameProgress(first,user);
 const second=recordGame(first,'arena',{score:80,won:true});
 await client.saveGameProgress(second,user);
 assert.equal(server.data.records.arena.plays,2);
 assert.equal(server.data.records.arena.wins,2);
 assert.equal(server.revision,2);
});

test('a delayed reload preserves a newer offline city checkpoint through reopening and autosave',async()=>{
 const server=casServer(),storage=memoryStorage(),seed=store(server,storage);
 await seed.loadGameProgress(user);await seed.saveGameProgress(freshProgress(),user);
 const request=server.request.bind(server),entered=deferred(),release=deferred();let delayLoad=false,offline=false;
 server.request=async(...args)=>{
  if(args[0]==='game-save-load'&&delayLoad){const result=await request(...args);entered.resolve();await release.promise;return result;}
  if(args[0]==='game-save-sync'&&offline)throw Error('offline');
  return request(...args);
 };
 const client=store(server,storage,ids(100));await client.loadGameProgress(user);
 delayLoad=true;const reload=client.loadGameProgress(user);await entered.promise;
 const checkpoint=cityCheckpoint(recordGame(freshProgress(),'arena',{score:70,won:true}),7);
 offline=true;const saved=client.saveGameProgress(checkpoint,user);
 assert.equal(cachedProgress(storage).data.cities.world[0].turn,7,'checkpoint is local before the network can finish');
 assert.equal(cachedProgress(storage).dirty,true);
 release.resolve();const [loaded]=await Promise.all([reload,saved]);
 assert.equal(loaded.data.cities?.world[0]?.turn,7,'the reload must return the newer point of resumption');
 assert.equal(cachedProgress(storage).data.cities?.world[0]?.turn,7);
 assert.equal(cachedProgress(storage).dirty,true,'an offline checkpoint remains pending');

 delayLoad=false;offline=false;
 const reopened=store(server,storage,ids(200)),recovered=await reopened.loadGameProgress(user);
 await reopened.saveGameProgress(recovered.data,user);
 assert.equal(recovered.data.cities.world[0].turn,7);
 assert.equal(server.data.cities.world[0].turn,7);
 assert.equal(server.data.records.arena.plays,1);
 assert.equal(cachedProgress(storage).dirty,false);
});

test('a remount load waits for the in-flight save before reconciling its receipt',async()=>{
 const server=casServer(),storage=memoryStorage(),seed=store(server,storage);
 await seed.loadGameProgress(user);await seed.saveGameProgress(freshProgress(),user);
 const request=server.request.bind(server),entered=deferred(),release=deferred();let writes=0;
 server.request=async(...args)=>{
  if(args[0]!=='game-save-sync')return request(...args);
  const write=++writes,result=await request(...args);
  if(write===1){entered.resolve();await release.promise;}
  return result;
 };
 const client=store(server,storage,ids(100));await client.loadGameProgress(user);
 const checkpoint=cityCheckpoint(recordGame(freshProgress(),'arena',{score:70,won:true}),7);
 const saved=client.saveGameProgress(checkpoint,user);await entered.promise;
 const reload=client.loadGameProgress(user);
 await new Promise(resolve=>setImmediate(resolve));
 const writesBeforeCompletion=writes;release.resolve();
 const [,loaded]=await Promise.all([saved,reload]);
 assert.equal(writesBeforeCompletion,1,'a remount must not replay a receipt concurrently with its original request');
 assert.equal(loaded.data.cities.world[0].turn,7);
 assert.equal(loaded.data.records.arena.plays,1);
 assert.equal(cachedProgress(storage).dirty,false);
 assert.equal(cachedProgress(storage).pending,null);
});

test('a conflict retry never replaces a newer local city checkpoint while offline',async()=>{
 const server=casServer(),storage=memoryStorage(),other=store(server,memoryStorage());
 await other.loadGameProgress(user);await other.saveGameProgress(freshProgress(),user);
 const request=server.request.bind(server),entered=deferred(),release=deferred(),retryTurns=[];let writes=0,offline=true;
 server.request=async(...args)=>{
  if(args[0]!=='game-save-sync')return request(...args);
  if(++writes===1){entered.resolve();await release.promise;return request(...args);}
  if(offline){retryTurns.push(cachedProgress(storage).data.cities?.world[0]?.turn);throw Error('offline');}
  return request(...args);
 };
 const client=store(server,storage,ids(100)),loaded=await client.loadGameProgress(user);
 await other.saveGameProgress(recordGame(freshProgress(),'arena',{score:100,won:true}),user);
 const first=cityCheckpoint(recordGame(loaded.data,'arena',{score:70,won:true}),7);
 const saved=client.saveGameProgress(first,user);await entered.promise;
 const next=cityCheckpoint(recordGame(first,'arena',{score:90,won:true}),9);
 const latest=client.saveGameProgress(next,user);
 assert.equal(cachedProgress(storage).data.cities.world[0].turn,9);
 release.resolve();await Promise.all([saved,latest]);
 assert.ok(retryTurns.length>0,'the first write must encounter the other device revision');
 assert.ok(retryTurns.every(turn=>turn===9),'even a failed retry must leave the newest checkpoint on disk');
 assert.equal(cachedProgress(storage).data.cities.world[0].turn,9);
 assert.equal(cachedProgress(storage).dirty,true);

 offline=false;
 const reopened=store(server,storage,ids(200)),recovered=await reopened.loadGameProgress(user);
 await reopened.saveGameProgress(recovered.data,user);
 assert.equal(server.data.cities.world[0].turn,9);
 assert.equal(server.data.records.arena.plays,3,'both local runs and the other device run survive once');
});

test('an offline reload returns a checkpoint that arrived before its network error',async()=>{
 const server=casServer(),storage=memoryStorage(),seed=store(server,storage);
 await seed.loadGameProgress(user);await seed.saveGameProgress(freshProgress(),user);
 const request=server.request.bind(server),entered=deferred(),release=deferred();let offline=false;
 server.request=async(...args)=>{
  if(offline){if(args[0]==='game-save-load'){entered.resolve();await release.promise;}throw Error('offline');}
  return request(...args);
 };
 const client=store(server,storage,ids(100));await client.loadGameProgress(user);
 offline=true;const reload=client.loadGameProgress(user);await entered.promise;
 const saved=client.saveGameProgress(cityCheckpoint(freshProgress(),7),user);
 release.resolve();const [loaded]=await Promise.all([reload,saved]);
 assert.equal(loaded.online,false);
 assert.equal(loaded.data.cities?.world[0]?.turn,7);
 assert.equal(cachedProgress(storage).data.cities.world[0].turn,7);
 assert.equal(cachedProgress(storage).dirty,true);
});

test('overlapping remount loads retain checkpoints written before their queued network work',async()=>{
 const server=casServer(),storage=memoryStorage(),seed=store(server,storage);
 await seed.loadGameProgress(user);await seed.saveGameProgress(freshProgress(),user);
 const request=server.request.bind(server),entered=deferred(),release=deferred();let delayed=false,loads=0;
 server.request=async(...args)=>{
  if(args[0]==='game-save-load'&&delayed&&++loads===1){const result=await request(...args);entered.resolve();await release.promise;return result;}
  if(args[0]==='game-save-sync'&&delayed)throw Error('offline');
  return request(...args);
 };
 const client=store(server,storage,ids(100));await client.loadGameProgress(user);
 delayed=true;const first=client.loadGameProgress(user);await entered.promise;
 const second=client.loadGameProgress(user),saved=client.saveGameProgress(cityCheckpoint(freshProgress(),7),user);
 release.resolve();const [one,two]=await Promise.all([first,second,saved]);
 assert.equal(one.data.cities?.world[0]?.turn,7);
 assert.equal(two.data.cities?.world[0]?.turn,7);
 assert.equal(cachedProgress(storage).data.cities?.world[0]?.turn,7);
 assert.equal(cachedProgress(storage).dirty,true);
});

test('an account without an id stays on the isolated guest save path',async()=>{
 let loaded=0,saved=0,requested=0;
 const client=createMemberSaveStore({
  request:async()=>{requested++;throw Error('must not run');},
  guestLoad:async()=>{loaded++;return{data:freshProgress(),online:true,message:'guest'};},
  guestSave:async()=>{saved++;return'guest saved';},
  getStorage:()=>memoryStorage()
 });
 assert.equal((await client.loadGameProgress({})).message,'guest');
 assert.equal(await client.saveGameProgress(freshProgress(),{}),'guest saved');
 assert.equal(loaded,1);assert.equal(saved,1);assert.equal(requested,0);
});

test('late save callbacks cannot replace another account progress in the Games UI',()=>{
 const source=readFileSync(new URL('../src/games/GamesHub.jsx',import.meta.url),'utf8');
 assert.match(source,/ownerRef\.current=user\?\.id\|\|null/);
 assert.match(source,/ownerRef\.current===ownerId/);
 assert.match(source,/ownerRef\.current!==ownerId/);
});
