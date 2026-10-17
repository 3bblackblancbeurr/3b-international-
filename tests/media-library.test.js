import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {MEDIA_LIBRARY_KEY,MEDIA_BACKUP_MAX_BYTES,NARRATION_IDS,normalizeMediaLibrary,loadMediaLibrary,saveMediaLibrary,saveMediaLibraryDetailed,persistMediaLibrary,createMediaLibrarySession,mediaBackupByteLength,addWatchEntry,updateWatchEntry,toggleSavedNarration,rememberNarration,findWatchEntries,exportMediaLibrary,mergeMediaLibrary} from '../src/member/media/media-library.js';
const blank=()=>normalizeMediaLibrary(null);
test('media exposes only nine real local narrated stories with known provenance',()=>{const manifest=JSON.parse(readFileSync(new URL('../src/world/narration-manifest.json',import.meta.url)));assert.deepEqual([...NARRATION_IDS].sort(),manifest.clips.map(clip=>clip.id).sort());for(const clip of manifest.clips)assert.ok(existsSync(new URL('../public'+clip.src,import.meta.url)));assert.match(manifest.attributionUrl,/^https:/);});
test('watchlist retains exact user titles, status and notes across storage and accent-insensitive search',()=>{let state=addWatchEntry(blank(),{title:'Été culturel',creator:'Réalisatrice',notes:'Un voyage à retrouver'},'film-1');state=updateWatchEntry(state,'film-1',{status:'watching'});const values=new Map(),store={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};assert.equal(saveMediaLibrary(state,store),true);state=loadMediaLibrary(store).state;assert.equal(findWatchEntries(state,{query:'ete voyage',status:'watching'}).length,1);assert.equal(findWatchEntries(state,{status:'watched'}).length,0);assert.equal(state.entries[0].title,'Été culturel');});
test('unsafe identities, unknown statuses, excessive entries and empty input cannot mutate the list',()=>{const state=blank();assert.throws(()=>addWatchEntry(state,{title:' '},'a'));assert.throws(()=>addWatchEntry(state,{title:'Film'},'../bad'));assert.equal(state.entries.length,0);const valid=addWatchEntry(state,{title:'Film'},'film');assert.throws(()=>updateWatchEntry(valid,'film',{status:'published'}));assert.throws(()=>updateWatchEntry(valid,'missing',{status:'watched'}));assert.throws(()=>addWatchEntry(valid,{title:'Duplicate'},'film'));});
test('audio resume is bounded by clip duration and cannot target unrelated assets',()=>{let state=rememberNarration(blank(),'prologue',999,28.176);assert.equal(state.positions.prologue.seconds,28.176);assert.throws(()=>rememberNarration(state,'../other',1,5));assert.throws(()=>rememberNarration(state,'prologue',1,Infinity));state=rememberNarration(state,'prologue',28,28.176,true);state=rememberNarration(state,'prologue',0,28.176);assert.equal(state.positions.prologue.finished,true);state=toggleSavedNarration(state,'prologue');assert.equal(state.savedNarrations.length,1);state=toggleSavedNarration(state,'prologue');assert.equal(state.savedNarrations.length,0);});
test('backup merges additions without replacing current notes, status or local resume points',()=>{let first=addWatchEntry(blank(),{title:'Film personnel',notes:'Note locale'},'film-1');first=rememberNarration(first,'prologue',12,28);let other=updateWatchEntry(first,'film-1',{notes:'Ancienne note'});other=addWatchEntry(other,{title:'Nouveau film'},'film-2');other=rememberNarration(other,'prologue',2,28);const next=mergeMediaLibrary(first,exportMediaLibrary(other));assert.equal(next.entries.length,2);assert.equal(next.entries[0].notes,'Note locale');assert.equal(next.positions.prologue.seconds,12);assert.equal(first.entries.length,1);assert.throws(()=>mergeMediaLibrary(first,'broken'));assert.throws(()=>mergeMediaLibrary(first,JSON.stringify({format:'other',version:1,entries:[]})));});
test('corrupt storage and quota errors do not falsely report successful save',()=>{const storage={getItem:()=>'{bad',setItem:()=>{throw Error('quota');}};assert.ok(loadMediaLibrary(storage).warning);assert.equal(saveMediaLibrary(blank(),storage),false);const normalized=normalizeMediaLibrary({version:1,entries:[{id:'one',title:'Test'},{id:'one',title:'Duplicate'}],savedNarrations:['x','prologue','prologue'],positions:{x:{seconds:3,duration:4}}});assert.equal(normalized.entries.length,1);assert.deepEqual(normalized.savedNarrations,['prologue']);assert.deepEqual(normalized.positions,{});});

const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function lockQueue(){let queue=Promise.resolve(),requests=0;return {get requests(){return requests;},request(name,fn){assert.equal(name,MEDIA_LIBRARY_KEY);requests++;const next=queue.then(()=>fn());queue=next.catch(()=>{});return next;}};}

test('empty title edits fail without dropping a saved entry or mutating any field',()=>{
 const state=addWatchEntry(blank(),{title:'À conserver',notes:'Ma note'},'one');
 for(const title of ['', '   ', '\n\t', null])assert.throws(()=>updateWatchEntry(state,'one',{title,notes:'Not applied'}),/titre/);
 assert.equal(state.entries.length,1);assert.equal(state.entries[0].title,'À conserver');assert.equal(state.entries[0].notes,'Ma note');
 assert.equal(updateWatchEntry(state,'one',{title:undefined}).entries[0].title,'À conserver');assert.throws(()=>addWatchEntry(state,{title:'Film'},42),/Identifiant/);
 assert.throws(()=>updateWatchEntry(state,'one',null),/invalide/);
});

test('backups use an explicit UTF-8 byte limit and can reread the largest valid Unicode list',()=>{
 let state=blank();for(let index=0;index<150;index++)state=addWatchEntry(state,{title:'文'.repeat(100),creator:'文'.repeat(100),notes:'文'.repeat(1000)},'unicode-'+index);
 const source=exportMediaLibrary(state);assert.ok(mediaBackupByteLength(source)>500000);assert.ok(mediaBackupByteLength(source)<MEDIA_BACKUP_MAX_BYTES);assert.equal(mediaBackupByteLength(source),Buffer.byteLength(source,'utf8'));assert.equal(mergeMediaLibrary(blank(),source).entries.length,150);
 assert.throws(()=>mergeMediaLibrary(blank(),'文'.repeat(400000)),/1 Mo/);
});

test('parseable or unparseable corrupt stored data is preserved rather than silently replaced',()=>{
 for(const source of ['{bad',JSON.stringify({version:999,entries:[]}),JSON.stringify({version:1,entries:[{id:'one',title:''}]})]){
  const target=memory();target.setItem(MEDIA_LIBRARY_KEY,source);const loaded=loadMediaLibrary(target);assert.ok(loaded.warning);
  const next=addWatchEntry(loaded.state,{title:'Nouveau titre'},'new');const result=saveMediaLibraryDetailed(next,target);assert.equal(result.ok,false);assert.match(result.warning,/pas été écrasée/);assert.equal(target.getItem(MEDIA_LIBRARY_KEY),source);assert.equal(result.state.entries[0].title,'Nouveau titre');
 }
});

test('two stale tabs preserve independent additions, field edits, saved stories and audio positions',()=>{
 const target=memory();saveMediaLibrary(addWatchEntry(blank(),{title:'Film initial',notes:'Note initiale'},'base'),target);
 let a=loadMediaLibrary(target).state,b=loadMediaLibrary(target).state;
 a=addWatchEntry(updateWatchEntry(a,'base',{title:'Titre corrigé'}),{title:'Ajout A'},'a');a=toggleSavedNarration(a,'prologue');a=rememberNarration(a,'prologue',12,28);
 b=addWatchEntry(updateWatchEntry(b,'base',{notes:'Note B'}),{title:'Ajout B'},'b');b=toggleSavedNarration(b,'entry-france');b=rememberNarration(b,'entry-france',6,25);
 assert.equal(saveMediaLibrary(a,target),true);assert.equal(saveMediaLibrary(b,target),true);
 let combined=loadMediaLibrary(target).state;assert.equal(combined.entries.length,3);const base=combined.entries.find(item=>item.id==='base');assert.equal(base.title,'Titre corrigé');assert.equal(base.notes,'Note B');assert.deepEqual([...combined.savedNarrations].sort(),['entry-france','prologue']);assert.equal(combined.positions.prologue.seconds,12);assert.equal(combined.positions['entry-france'].seconds,6);
 // A legacy caller may retain its own view without seeing B's added row.
 a=updateWatchEntry(a,'a',{status:'watched'});assert.equal(saveMediaLibrary(a,target),true);combined=loadMediaLibrary(target).state;assert.equal(combined.entries.length,3);assert.equal(combined.entries.find(item=>item.id==='b').title,'Ajout B');
});

test('a stale tab cannot resurrect another tab’s removal when it edits an unrelated row',()=>{
 const target=memory();let seed=addWatchEntry(blank(),{title:'One'},'one');seed=addWatchEntry(seed,{title:'Two'},'two');saveMediaLibrary(seed,target);
 const a=loadMediaLibrary(target).state,b=loadMediaLibrary(target).state;
 assert.equal(saveMediaLibrary({...a,entries:a.entries.filter(item=>item.id!=='one')},target),true);
 assert.equal(saveMediaLibrary(updateWatchEntry(b,'two',{notes:'Kept'}),target),true);
 const result=loadMediaLibrary(target).state;assert.equal(result.entries.length,1);assert.equal(result.entries[0].id,'two');assert.equal(result.entries[0].notes,'Kept');
});

test('same-field edits and remove-versus-edit conflicts preserve stored data and the caller’s draft',()=>{
 const target=memory();saveMediaLibrary(addWatchEntry(blank(),{title:'Film',notes:'Original'},'one'),target);
 const a=loadMediaLibrary(target).state,b=loadMediaLibrary(target).state;
 assert.equal(saveMediaLibrary(updateWatchEntry(a,'one',{notes:'A'}),target),true);
 const conflict=saveMediaLibraryDetailed(updateWatchEntry(b,'one',{notes:'B'}),target);assert.equal(conflict.ok,false);assert.equal(conflict.state.entries[0].notes,'B');assert.equal(loadMediaLibrary(target).state.entries[0].notes,'A');assert.match(conflict.warning,/autre onglet/);
 const removed=saveMediaLibraryDetailed({...b,entries:[]},target);assert.equal(removed.ok,false);assert.equal(loadMediaLibrary(target).state.entries.length,1);
});

test('concurrent positions for one narration retain the furthest progress and completed flag',()=>{
 const target=memory(),a=loadMediaLibrary(target).state,b=loadMediaLibrary(target).state;
 saveMediaLibrary(rememberNarration(a,'prologue',20,28,true),target);saveMediaLibrary(rememberNarration(b,'prologue',8,28),target);
 const result=loadMediaLibrary(target).state.positions.prologue;assert.equal(result.seconds,20);assert.equal(result.finished,true);
});

test('two independent queued sessions use a shared lock and keep rapid mutations in order',async()=>{
 const target=memory(),locks=lockQueue(),a=createMediaLibrarySession({storage:target,locks}),b=createMediaLibrarySession({storage:target,locks});
 const a1=a.commit(state=>addWatchEntry(state,{title:'A'},'a'));
 const a2=a.commit(state=>updateWatchEntry(state,'a',{notes:'A revised'}));
 const b1=b.commit(state=>addWatchEntry(state,{title:'B'},'b'));
 const b2=b.commit(state=>rememberNarration(state,'entry-france',10,25));
 const results=await Promise.all([a1.persistence,a2.persistence,b1.persistence,b2.persistence]);assert.ok(results.every(result=>result.ok));assert.equal(locks.requests,4);
 assert.equal(a.isCurrent(a1.revision),false);assert.equal(a.isCurrent(a2.revision),true);assert.equal(b.isCurrent(b2.revision),true);
 const state=loadMediaLibrary(target).state;assert.equal(state.entries.length,2);assert.equal(state.entries.find(item=>item.id==='a').notes,'A revised');assert.equal(state.positions['entry-france'].seconds,10);
});

test('queued add then delete before persistence completes does not reintroduce the removed title',async()=>{
 const target=memory(),session=createMediaLibrarySession({storage:target,locks:lockQueue()});
 const added=session.commit(state=>addWatchEntry(state,{title:'Temporary'},'temporary'));
 const removed=session.commit(state=>({...state,entries:state.entries.filter(item=>item.id!=='temporary')}));
 await Promise.all([added.persistence,removed.persistence]);assert.equal(session.getState().entries.length,0);assert.equal(loadMediaLibrary(target).state.entries.length,0);
});

test('queued validation is synchronous and storage failures never claim successful persistence',async()=>{
 const target=memory(),session=createMediaLibrarySession({storage:target,locks:lockQueue()}),operation=session.commit(state=>addWatchEntry(state,{title:'Valid'},'valid'));
 assert.throws(()=>session.commit(state=>updateWatchEntry(state,'valid',{title:''})),/titre/);assert.equal(session.getState().entries[0].title,'Valid');await operation.persistence;
 const broken={getItem(){return null;},setItem(){throw Error('quota');}};const result=await persistMediaLibrary(session.getState(),broken,lockQueue());assert.equal(result.ok,false);assert.equal(result.state.entries[0].title,'Valid');
});

test('a failed quota write remains pending and survives the next successful queued operation',async()=>{
 const backing=memory();let blocked=true;
 const target={getItem:key=>backing.getItem(key),setItem(key,value){if(blocked)throw Error('quota');backing.setItem(key,value);}};
 const session=createMediaLibrarySession({storage:target,locks:lockQueue()});
 const first=session.commit(state=>addWatchEntry(state,{title:'Ajout avant quota'},'kept-id'));
 assert.equal((await first.persistence).ok,false);assert.equal(session.getState().entries[0].id,'kept-id');
 blocked=false;
 const second=session.commit(state=>rememberNarration(state,'prologue',12,28));
 assert.equal((await second.persistence).ok,true);const saved=loadMediaLibrary(backing).state;
 assert.equal(saved.entries.length,1);assert.equal(saved.entries[0].id,'kept-id');assert.equal(saved.entries[0].title,'Ajout avant quota');assert.equal(saved.positions.prologue.seconds,12);
});

test('a conflicting edit is not silently discarded by a later unrelated action',async()=>{
 const target=memory(),locks=lockQueue();saveMediaLibrary(addWatchEntry(blank(),{title:'Film',notes:'Original'},'one'),target);
 const a=createMediaLibrarySession({storage:target,locks}),b=createMediaLibrarySession({storage:target,locks});
 assert.equal((await a.commit(state=>updateWatchEntry(state,'one',{notes:'Autre onglet'})).persistence).ok,true);
 assert.equal((await b.commit(state=>updateWatchEntry(state,'one',{notes:'Ma version non enregistrée'})).persistence).ok,false);
 const after=b.commit(state=>rememberNarration(state,'prologue',5,28));assert.equal((await after.persistence).ok,false);
 assert.equal(b.getState().entries[0].notes,'Ma version non enregistrée');assert.equal(b.getState().positions.prologue.seconds,5);
 assert.equal(loadMediaLibrary(target).state.entries[0].notes,'Autre onglet');
});
