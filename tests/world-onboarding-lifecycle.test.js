import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
const stage=readFileSync(new URL('../src/arena/ArenaStage.jsx',import.meta.url),'utf8');
test('first creation does not compete with a full world renderer behind the editor',()=>{
 assert.match(world,/if\(!loaded\|\|!worldRequested\)return/);
 assert.match(world,/setWorldRequested\(!!result\.data\.adventure\.avatar\.created\|\|!!result\.data\.adventure\.encounter\)/);
 assert.match(world,/setWorldRequested\(true\);setPanel\(null\)/);
 assert.match(world,/function closePanel\(\)\{setWorldRequested\(true\)/);
});
test('queued opening waits for real world assets instead of playing over a loading canvas',()=>{
 assert.match(world,/if\(storyCinematic\|\|!cinematicQueue\.length\|\|assetsLoading\|\|!scene\.current\)return/);
 assert.match(world,/\[cinematicQueue,storyCinematic,assetsLoading,worldRequested\]/);
});
test('avatar preview obeys fluid mode and suspends its GPU work when offscreen',()=>{
 assert.match(stage,/localStorage\.getItem\('3b-world-quality'\)==='fluid'/);
 assert.match(stage,/renderer\.shadowMap\.enabled=!lowPower/);
 assert.match(stage,/if\(lowPower&&now-at<1000\/30\)return/);
 assert.match(stage,/document\.hidden\|\|!inView/);
 assert.match(stage,/io\?\.disconnect\(\)/);
});
