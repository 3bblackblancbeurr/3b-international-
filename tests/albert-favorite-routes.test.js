import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readAlbertFavoriteModules,WORLD_FAVORITES_KEY} from '../src/components/albert-favorite-routes.js';

const memory=(raw)=>({getItem(key){assert.equal(key,WORLD_FAVORITES_KEY);return raw;}});
test('Albert favorites are only existing local 3B modules and preserve canonical order',()=>{
 assert.deepEqual(readAlbertFavoriteModules(null),[]);
 assert.deepEqual(readAlbertFavoriteModules(memory('invalid-json')),[]);
 assert.deepEqual(readAlbertFavoriteModules(memory(JSON.stringify({id:'travel'}))),[]);
 const picks=['travel','health','not-a-real-route','shop','travel'];
 assert.deepEqual(readAlbertFavoriteModules(memory(JSON.stringify(picks))).map(item=>item.id),['health','shop','travel']);
 assert.ok(readAlbertFavoriteModules(memory(JSON.stringify(Array(120).fill('health')))).length<=6);
});
test('Favorites require no member tracking or remote computation',()=>{
 const src=readFileSync(new URL('../src/components/AlbertPublicPreview.jsx',import.meta.url),'utf8');
 const store=readFileSync(new URL('../src/components/albert-favorite-routes.js',import.meta.url),'utf8');
 assert.match(src,/readAlbertFavoriteModules/);
 assert.match(src,/Mes raccourcis préférés/);
 assert.match(src,/favoriteRoutes\.map\(/);
 assert.match(store,/WORLD_FAVORITES_KEY='threeb-world-favorites-v1'/);
 assert.doesNotMatch(store,/\b(fetch|navigator|geolocation|supabase|localStorage\.setItem)\b/i);
});
