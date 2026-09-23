import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passportAccessLevel, canAccess3B, canAccessWorld3B } from '../src/passport/access.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const loyalty = readFileSync(new URL('../src/loyalty/LoyaltyContext.jsx', import.meta.url), 'utf8');
const memberApi = readFileSync(new URL('../supabase/functions/member-api/index.ts', import.meta.url), 'utf8');

test('Passeport access levels are deterministic and inventory-backed', () => {
  assert.equal(passportAccessLevel(null, []), 0);
  const identity = { userId: 'member-1' };
  assert.equal(passportAccessLevel(identity, []), 1);
  assert.equal(passportAccessLevel(identity, [{ item_code: 'PASSPORT_FOUNDER_GOLD', quantity: 0 }]), 1);
  assert.equal(passportAccessLevel(identity, [{ item_code: 'PASSPORT_FOUNDER_GOLD', quantity: 1 }]), 2);
  assert.equal(canAccess3B(identity, []), true);
  assert.equal(canAccessWorld3B(identity, []), false);
  assert.equal(canAccessWorld3B(identity, [{ item_code: 'PASSPORT_FOUNDER_GOLD', quantity: 1 }]), true);
});

test('App enforces Passport 1 globally and Passport 2 for Monde/Arène', () => {
  assert.match(app, /passportLevel < 1/);
  assert.match(app, /passportLevel < 2/);
  assert.match(app, /\["world3b", "arena"\]\.includes\(page\)/);
  assert.match(app, /Passeport \{level\} requis/);
});

test('Member snapshot exposes only owned positive inventory quantities to the client', () => {
  assert.match(memberApi, /inventory\?user_id=eq\.'/);
  assert.match(memberApi, /select=item_code,quantity&quantity=gt\.0/);
  assert.match(loyalty, /inventory:Array\.isArray\(owned\?\.inventory\)\?owned\.inventory:\[\]/);
});

test('Premium intro and exact spoken welcome are pinned', () => {
  assert.match(app, /<p>Un écosystème premium\.<\/p>/);
  assert.match(app, /Bienvenue dans l'univers 3B\. L'héritage commence maintenant\. Reste attentif tout le temps partout\./);
});
