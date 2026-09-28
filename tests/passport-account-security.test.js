import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panel=readFileSync('src/loyalty/AccountSecurityPanel.jsx','utf8');
const account=readFileSync('src/loyalty/AccountPage.jsx','utf8');
const client=readFileSync('src/loyalty/client.js','utf8');

test('private Supabase auth UUID is not rendered as the member number',()=>{
 assert.doesNotMatch(account,/N° membre\s*:\s*\{profile\.user_id/i);
 assert.match(account,/account\.passport\?\.memberId/);
});

test('account can revoke other sessions and passkeys stay rollout-gated',()=>{
 assert.match(panel,/signOut\(\{scope:'others'\}\)/);
 assert.match(panel,/PASSKEYS_ENABLED/);
 assert.match(client,/experimental:\{passkey:true\}/);
 assert.match(client,/auth\.registerPasskey\(\)/);
 assert.match(client,/auth\.signInWithPasskey\(\)/);
 assert.match(client,/auth\.passkey\.list\(\)/);
});

test('UI never equates a typed profile name with civil verification',()=>{
 assert.match(panel,/Le nom du profil n’est pas une preuve d’identité/);
 assert.match(panel,/civilIdentityVerified/);
});
