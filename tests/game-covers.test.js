import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GAME_CATALOG,remoteGameCover} from '../src/games/catalog.js';
const manifest=JSON.parse(readFileSync(new URL('../public/games/covers/artwork-manifest.json',import.meta.url),'utf8'));
test('every playable catalogue identity has an actual distinct cover in the same format and delivery budget',()=>{
 const hashes=new Set();let bytes=0;
 assert.equal(manifest.artworks.length,GAME_CATALOG.length);
 for(const game of GAME_CATALOG){
  const record=manifest.artworks.find(record=>record.id===game.id);
  assert.ok(record,game.id);assert.equal(record.file,game.cover);assert.deepEqual([record.width,record.height],[960,640]);
  const path=new URL('../public'+game.cover,import.meta.url),buffer=readFileSync(path);
  assert.equal(buffer.subarray(0,4).toString(),'RIFF');assert.equal(buffer.subarray(8,12).toString(),'WEBP');
  assert.equal(statSync(path).size,record.bytes);assert.ok(record.bytes<=120000);bytes+=record.bytes;
  hashes.add(createHash('sha256').update(buffer).digest('hex'));
 }
 assert.equal(hashes.size,GAME_CATALOG.length,'Each game keeps its own artwork');
 assert.ok(bytes<1000000,'The complete illustration collection remains below 1 MB');
});
test('connected game categories use the same optimized illustration collection',()=>{
 for(const visual of ['pitch','guardian','runner','underground','district','forge','portal','unknown']){
  assert.ok(GAME_CATALOG.some(game=>game.cover===remoteGameCover(visual)));
 }
 assert.notEqual(remoteGameCover('pitch'),remoteGameCover('district'));
});
