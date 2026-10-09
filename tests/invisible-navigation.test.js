import test from 'node:test';
import assert from 'node:assert/strict';
import { INVISIBLE_VIEWS, readInvisibleView, invisibleViewHref } from '../src/world/invisible/navigation.js';
import { getPageHref, readLocation } from '../src/lib/navigation.js';

test('all adventure views can be bookmarked without changing the application route', () => {
  const original = new URL('https://3b.example/?campaign=summer#monde-invisible');
  for (const view of INVISIBLE_VIEWS) {
    const target = new URL(invisibleViewHref(view, original), original);
    assert.equal(readLocation(target).page, 'invisible');
    assert.equal(readInvisibleView(target), view);
    assert.equal(target.searchParams.get('campaign'), 'summer');
  }
  assert.equal(original.href, 'https://3b.example/?campaign=summer#monde-invisible');
});

test('invalid views and view parameters on another route do not open a hidden adventure screen', () => {
  for (const query of ['invisibleView=unknown', 'invisibleView=%3Cscript%3E', 'invisibleView=']) {
    assert.equal(readInvisibleView(new URL(`https://3b.example/?${query}#monde-invisible`)), 'adventure');
  }
  assert.equal(readInvisibleView(new URL('https://3b.example/?invisibleView=missions#boutique')), 'adventure');
});

test('return to the adventure removes its secondary view and global navigation starts a clean destination', () => {
  const previous = new URL('https://3b.example/?invisibleView=journal&campaign=summer#monde-invisible');
  const adventure = new URL(invisibleViewHref('adventure', previous), previous);
  assert.equal(adventure.searchParams.has('invisibleView'), false);
  for (const page of ['home', 'passport', 'shop', 'world3b', 'invisible']) {
    const target = new URL(getPageHref(page, previous), previous);
    assert.equal(target.searchParams.has('invisibleView'), false);
    assert.equal(target.searchParams.get('campaign'), 'summer');
    assert.equal(readLocation(target).page, page);
  }
});
