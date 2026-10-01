import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocation, getPageHref } from '../src/lib/navigation.js';

test('Ma Ville has a restorable independent route', () => {
  assert.equal(readLocation({ hash: '#ma-ville' }).page, 'city3b');
  assert.equal(getPageHref('city3b', { href: 'https://app.example/#passeport' }), '/#ma-ville');
});

test('a valid partner consent request opens the Passport and does not leak through outgoing links', () => {
  const token = 'a4'.repeat(32);
  const search = `?page=passport&passport_request=${token}`;
  assert.deepEqual(readLocation({ hash: '#accueil', search }), { page: 'passport', search, requestToken: token });
  for (const page of ['home', 'city3b', 'world3b', 'passport', 'member']) {
    const target = getPageHref(page, { href: `https://app.example/${search}#passeport` });
    assert.equal(target.includes(token), false);
    assert.equal(target.includes('passport_request'), false);
  }
});

test('malformed requests do not change the destination or override account recovery', () => {
  for (const token of ['invalid', 'A4'.repeat(32), 'a4'.repeat(31), 'a4'.repeat(33)]) {
    assert.deepEqual(readLocation({ hash: '#accueil', search: `?passport_request=${token}` }), { page: 'home', search: `?passport_request=${token}` });
  }
  assert.equal(readLocation({ hash: '#passeport', search: `?reset=1&passport_request=${'a4'.repeat(32)}` }).page, 'member');
});
