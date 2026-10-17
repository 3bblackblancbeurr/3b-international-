import test from 'node:test';
import assert from 'node:assert/strict';
import {CANON_WORLDS,GUARDIAN_STORIES,STORY_CANON} from '../src/world/story-canon.js';
import {MANGA_LIBRARY_KEY,MANGA_READINGS,exportMangaLibrary,loadMangaLibrary,mergeMangaLibrary,normalizeMangaLibrary,saveMangaLibrary,searchMangaReadings,setReadingLocation,toggleReadingState} from '../src/manga/manga-library.js';
const memory=()=>{const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};};
test('the manga reader uses the existing canon and exactly eight guardians',()=>{
 assert.equal(MANGA_READINGS.length,12);assert.equal(MANGA_READINGS.filter(item=>item.kind==='gardien').length,8);
 for(const [id,canon] of Object.entries(CANON_WORLDS)){const reading=MANGA_READINGS.find(item=>item.id===id);assert.equal(reading.title,canon.guardian);assert.equal(reading.value,canon.value);assert.ok(reading.paragraphs.some(([,text])=>text===GUARDIAN_STORIES[id].conflict));}
 assert.ok(MANGA_READINGS.find(item=>item.id==='kais').paragraphs.some(([,text])=>text===STORY_CANON.hero.rule));assert.equal(MANGA_READINGS.find(item=>item.id==='finale').spoiler,true);
});
test('reading progress and favorites are independent reversible choices',()=>{
 const initial=normalizeMangaLibrary();let state=toggleReadingState(initial,'france','readIds');state=toggleReadingState(state,'france','favoriteIds');assert.deepEqual(state.readIds,['france']);assert.deepEqual(state.favoriteIds,['france']);state=toggleReadingState(state,'france','readIds');assert.deepEqual(state.readIds,[]);assert.deepEqual(state.favoriteIds,['france']);assert.deepEqual(initial.readIds,[]);
 assert.equal(setReadingLocation(state,'algerie').lastId,'algerie');assert.throws(()=>setReadingLocation(state,'unknown'));assert.throws(()=>toggleReadingState(state,'france','lastId'));
});
test('search finds canon characters and values without requiring accents',()=>{assert.equal(searchMangaReadings('celiane','gardien')[0].id,'france');assert.equal(searchMangaReadings('algerie loyaute')[0].id,'algerie');assert.deepEqual(searchMangaReadings('','gardien',['estonie']).map(item=>item.id),['estonie']);assert.equal(searchMangaReadings('personnage absent').length,0);});
test('progress persists and another tab cannot overwrite it from an old snapshot',()=>{
 const storage=memory(),first=loadMangaLibrary(storage),second=loadMangaLibrary(storage);const one=saveMangaLibrary(toggleReadingState(first.state,'france','readIds'),first.raw,storage);assert.equal(one.saved,true);const stale=saveMangaLibrary(toggleReadingState(second.state,'algerie','readIds'),second.raw,storage);assert.equal(stale.conflict,true);assert.deepEqual(stale.state.readIds,['france']);const retry=saveMangaLibrary(toggleReadingState(stale.state,'algerie','readIds'),stale.raw,storage);assert.equal(retry.saved,true);assert.deepEqual(loadMangaLibrary(storage).state.readIds,['france','algerie']);
});
test('malformed and denied storage never crashes the reader or destroys an unreadable save',()=>{
 const storage=memory();storage.setItem(MANGA_LIBRARY_KEY,'{broken');const loaded=loadMangaLibrary(storage);assert.ok(loaded.warning);const saved=saveMangaLibrary(toggleReadingState(loaded.state,'kais','readIds'),loaded.raw,storage);assert.equal(saved.saved,true);assert.equal(storage.getItem(`${MANGA_LIBRARY_KEY}_recovery`),'{broken');assert.deepEqual(loadMangaLibrary(storage).state.readIds,['kais']);const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}};assert.ok(loadMangaLibrary(denied).warning);assert.equal(saveMangaLibrary(toggleReadingState(loaded.state,'kais','readIds'),null,denied).saved,false);
});
test('exports merge progress and favorites without replacing the current reading',()=>{
 let first=setReadingLocation(toggleReadingState(normalizeMangaLibrary(),'france','readIds'),'maroc');let incoming=toggleReadingState(normalizeMangaLibrary(),'algerie','favoriteIds');incoming=toggleReadingState(incoming,'france','readIds');incoming=toggleReadingState(incoming,'kais','readIds');const merged=mergeMangaLibrary(first,exportMangaLibrary(incoming));assert.deepEqual(merged.readIds,['france','kais']);assert.deepEqual(merged.favoriteIds,['algerie']);assert.equal(merged.lastId,'maroc');
});
test('imports reject mismatched formats, unknown repères and oversized payloads',()=>{
 const state=normalizeMangaLibrary(),payload=JSON.parse(exportMangaLibrary(state));assert.throws(()=>mergeMangaLibrary(state,'not json'));assert.throws(()=>mergeMangaLibrary(state,JSON.stringify({...payload,format:'other'})));assert.throws(()=>mergeMangaLibrary(state,JSON.stringify({...payload,readIds:['fake']})));assert.throws(()=>mergeMangaLibrary(state,' '.repeat(20001)));assert.deepEqual(normalizeMangaLibrary({readIds:['kais','fake','kais'],favoriteIds:['finale'],lastId:'absent'}),{version:1,readIds:['kais'],favoriteIds:['finale'],lastId:'kais'});
});
