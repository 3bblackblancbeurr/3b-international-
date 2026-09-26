import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panel=readFileSync(new URL('../src/loyalty/AccountSecurityPanel.jsx',import.meta.url),'utf8');
const account=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');

test('member account can revoke all other sessions without logging out the current device',()=>{
 assert.match(panel,/signOut\(\{scope:'others'\}\)/);
 assert.match(panel,/Cet appareil reste connecté/);
});

test('passkey controls stay behind the rollout flag',()=>{
 assert.match(panel,/PASSKEYS_ENABLED/);
 assert.match(panel,/register3BPasskey/);
 assert.match(panel,/delete3BPasskey/);
 assert.match(panel,/domaine 3B définitif/);
});

test('the security panel is part of the signed-in account surface',()=>{
 assert.match(account,/import AccountSecurityPanel/);
 assert.match(account,/<AccountSecurityPanel\/>/);
});
