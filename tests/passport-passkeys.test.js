import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/loyalty/client.js',import.meta.url),'utf8');
const env=readFileSync(new URL('../.env.example',import.meta.url),'utf8');

test('passkeys stay disabled by default until the permanent RP domain is chosen',()=>{
 assert.match(client,/VITE_3B_PASSKEYS_ENABLED === 'true'/);
 assert.match(client,/if\(!PASSKEYS_ENABLED\)throw Error/);
 assert.match(env,/VITE_3B_PASSKEYS_ENABLED=false/);
});

test('passkey operations use Supabase WebAuthn APIs and require an authenticated user for enrollment',()=>{
 assert.match(client,/experimental:\{passkey:true\}/);
 assert.match(client,/auth\.registerPasskey\(\)/);
 assert.match(client,/auth\.signInWithPasskey\(\)/);
 assert.match(client,/auth\.passkey\.list\(\)/);
 assert.match(client,/auth\.passkey\.delete\(\{passkeyId\}\)/);
 assert.match(client,/if\(!session\?\.user\)throw Error/);
});
