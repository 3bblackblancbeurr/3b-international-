import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const hub=readFileSync(new URL('../src/games/GamesHub.jsx',import.meta.url),'utf8');
const memberSave=readFileSync(new URL('../src/games/memberSave.js',import.meta.url),'utf8');
const dada=readFileSync(new URL('../src/games/dada3b/online.js',import.meta.url),'utf8');
const penalty=readFileSync(new URL('../src/games/penaltyRush/online.js',import.meta.url),'utf8');
const power=readFileSync(new URL('../src/games/power3b/Power3B.jsx',import.meta.url),'utf8');

test('Games Hub uses the single 3B account and Passport context',()=>{
 assert.match(hub,/useLoyalty/);
 assert.match(hub,/account\.passport/);
 assert.match(hub,/loadGameProgress\(user\)/);
 assert.match(hub,/saveGameProgress\(next,user\)/);
});

test('Power 3B persists through the shared Games Hub account save instead of its own identity',()=>{
 assert.match(hub,/<Power3B[^>]*saved=\{progress\.power3b\}[^>]*onCheckpoint=\{checkpoint\}/s);
 assert.match(power,/onCheckpoint/);
 assert.doesNotMatch(power,/createClient\(|signIn|authClient|SUPABASE_URL/);
});

test('DADA and Penalty Rush authenticate with the same shared 3B Supabase session',()=>{
 for(const source of [dada,penalty]){
  assert.match(source,/from ['"]\.\.\/\.\.\/loyalty\/client\.js['"]/);
  assert.match(source,/authClient\.auth\.getSession\(\)/);
  assert.match(source,/Authorization:\s*['"]Bearer ['"]\s*\+\s*session\.access_token/);
  assert.doesNotMatch(source,/createClient\(/);
 }
});

test('signed-in game saves are account-scoped and cannot silently replace an existing server save',()=>{
 assert.match(memberSave,/const keyFor=id=>'3b_arcade_account_'\+id/);
 assert.match(memberSave,/session\?\.user\.id!==id/);
 assert.match(memberSave,/if\(existing\[0\]\?\.data\)return/);
 assert.match(memberSave,/member_game_saves/);
});
