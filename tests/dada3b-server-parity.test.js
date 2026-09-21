import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/games/dada3b/engine.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../supabase/functions/dada3b/engine.js',import.meta.url),'utf8');

test('DADA 3B client and authoritative server use byte-identical rules',()=>{
  assert.equal(server,client,'Synchronise src/games/dada3b/engine.js vers supabase/functions/dada3b/engine.js avant de livrer.');
});
