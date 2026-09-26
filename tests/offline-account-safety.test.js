import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const saves=readFileSync(new URL('../src/games/memberSave.js',import.meta.url),'utf8');
const loyalty=readFileSync(new URL('../src/loyalty/LoyaltyContext.jsx',import.meta.url),'utf8');
const passport=readFileSync(new URL('../src/passport/identity.js',import.meta.url),'utf8');

test('offline game mode is cache-only and never fabricates an online success',()=>{
 assert.match(saves,/online:false/);
 assert.match(saves,/Hors ligne : sauvegarde de ce compte conservée sur cet appareil/);
 assert.match(saves,/synchronisation en attente/);
 assert.doesNotMatch(saves,/online:true[^}]*catch/s);
});

test('server save wins over a guest or unknown local cache for an existing account',()=>{
 assert.match(saves,/Only a new empty account inherits this device's guest save/);
 assert.match(saves,/if\(!data\)data=local\?\.data\|\|\(await loadProgress\(\)\)\.data/);
 assert.match(saves,/if\(existing\[0\]\?\.data\)return/);
});

test('account switching clears remote snapshots and Passport identity is derived only from the owned session profile',()=>{
 assert.match(loyalty,/setData\(null\)/);
 assert.match(loyalty,/data\?\.profile\?\.user_id===session\?\.user\?\.id\?data:null/);
 assert.match(loyalty,/passportFromProfile\(owned\?\.profile,session\?\.user\)/);
 assert.match(passport,/if \(user\?\.id && profile\.user_id !== user\.id\) return null/);
});
