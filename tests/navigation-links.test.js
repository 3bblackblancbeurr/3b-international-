import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageHref, navigateTo, PAGE_HASHES, readLocation } from '../src/lib/navigation.js';

test('opening a navigation link after checkout or account recovery reaches its destination', () => {
  for (const query of ['checkout=success&session_id=cs_fixture', 'checkout=cancel', 'reset=1', 'auth=confirmed']) {
    const location = new URL(`https://3b.example/?${query}&campaign=summer#boutique`);
    for (const page of Object.keys(PAGE_HASHES)) {
      const destination = new URL(getPageHref(page, location), location);
      assert.equal(readLocation(destination).page, page);
      assert.equal(destination.searchParams.get('campaign'), 'summer');
      for (const name of ['checkout', 'session_id', 'reset', 'auth']) {
        assert.equal(destination.searchParams.has(name), false);
      }
    }
    assert.ok(location.search.includes(query), 'building a link must not mutate the current URL');
  }
});

test('links from a standalone game leave its route when opened in a new tab', () => {
  const location = new URL('https://3b.example/jeux/penalty-rush?campaign=summer');
  const destination = new URL(getPageHref('passport', location), location);
  assert.equal(destination.pathname, '/');
  assert.equal(readLocation(destination).page, 'passport');
  assert.equal(destination.searchParams.get('campaign'), 'summer');
});

test('an opaque card scan opens Passport without becoming a consent token and leaves outbound links clean',()=>{
 const reference='ab'.repeat(32);
 const location=new URL('https://3b.example/?page=passport&passport_card='+reference+'&campaign=card#accueil');
 const route=readLocation(location);
 assert.equal(route.page,'passport');assert.equal(route.cardReference,reference);assert.equal(route.requestToken,undefined);
 for(const page of Object.keys(PAGE_HASHES)){
  const destination=new URL(getPageHref(page,location),location);
  assert.equal(readLocation(destination).page,page);
  assert.equal(destination.searchParams.has('passport_card'),false);
  assert.equal(destination.searchParams.get('campaign'),'card');
 }
 assert.equal(readLocation(new URL('https://3b.example/?reset=1&passport_card='+reference)).page,'member','account recovery retains priority');
 for(const bad of ['AB'.repeat(32),'ab'.repeat(31),reference+'x','<script>']){
  const malformed=new URL('https://3b.example/#accueil');malformed.searchParams.set('passport_card',bad);
  assert.equal(readLocation(malformed).page,'home');assert.equal(readLocation(malformed).cardReference,undefined);
 }
});

test('a normal click and a new-tab link use the same destination without duplicate history', () => {
  const previousWindow = globalThis.window;
  const pushes = [];
  globalThis.window = {
    location: new URL('https://3b.example/?checkout=success&session_id=cs_fixture#boutique'),
    history: { pushState(_state, _title, href) {
      pushes.push(href);
      globalThis.window.location = new URL(href, globalThis.window.location);
    } },
  };
  try {
    const link = getPageHref('home');
    navigateTo('home');
    navigateTo('home');
    assert.deepEqual(pushes, [link]);
    assert.equal(readLocation(globalThis.window.location).page, 'home');
    assert.equal(getPageHref('unknown'), '/#accueil');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
