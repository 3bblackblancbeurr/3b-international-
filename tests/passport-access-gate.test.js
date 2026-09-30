import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasPassportAccess } from '../src/passport/access.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const loyalty = readFileSync(new URL('../src/loyalty/LoyaltyContext.jsx', import.meta.url), 'utf8');
const memberApi = readFileSync(new URL('../supabase/functions/member-api/index.ts', import.meta.url), 'utf8');

test('one 3B Passport unlocks the ecosystem', () => {
  assert.equal(hasPassportAccess(null), false);
  assert.equal(hasPassportAccess({ userId: 'member-1', passportState: 'active' }), true);
  assert.equal(hasPassportAccess({ userId: 'member-1', passportState: 'suspended' }), false);
});

test('App uses one Passport gate with no Passport 2 rule', () => {
  assert.match(app, /const hasPassport = hasPassportAccess\(loyalty\.passport\)/);
  assert.match(app, /const needsPassport = !loyalty\.loading && !hasPassport/);
  assert.match(app, /Passeport 3B requis/);
  assert.match(app, /Ma Ville, le Monde du 3B et tes avantages de membre/);
  assert.doesNotMatch(app, /Passeport 2/);
  assert.doesNotMatch(app, /passportLevel/);
});

test('Passport access does not depend on inventory availability', () => {
  assert.match(memberApi, /const optionalList=.*\.catch\(\(\)=>\[\]\)/);
  assert.match(memberApi, /optionalList\('\/rest\/v1\/inventory\?user_id=eq\.'/);
  assert.match(memberApi, /optionalList\('\/rest\/v1\/digital_store_entitlements\?user_id=eq\.'/);
  assert.doesNotMatch(app, /hasPassportAccess\([^)]*inventory/);
  assert.match(loyalty, /const passport=passportFromProfile\(owned\?\.profile,session\?\.user\)/);
});

test('Premium intro and exact spoken welcome are pinned', () => {
  assert.match(app, /Entrez dans la Cité des Huit Héritages\./);
  assert.match(app, /Ce n’est pas une marque\. C’est un héritage\./);
  assert.match(app, /Bienvenue dans l'univers 3B\. L'héritage commence maintenant\. Reste attentif tout le temps partout\./);
});
