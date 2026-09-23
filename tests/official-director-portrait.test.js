import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeAppearance, createAppearanceStore, appearanceFromSnapshot } from '../src/passport/appearance-store.js';
import {
  OFFICIAL_DIRECTOR_PORTRAIT, officialDirectorPortrait, matrixPortraitSource, loadMatrixPortraitImage,
} from '../src/passport/official-director-portrait.js';

const owner = {
  userId: '864dc1e7-292a-4165-aec6-4420eae64ce7', name: '3B',
  public_verified: true, public_badge_key: 'director_founder',
};
const localPhoto = 'data:image/jpeg;base64,YWJj';

test('the published portrait belongs only to the exact verified director account', () => {
  assert.equal(officialDirectorPortrait(owner), OFFICIAL_DIRECTOR_PORTRAIT);
  assert.equal(matrixPortraitSource(owner, null), OFFICIAL_DIRECTOR_PORTRAIT);
  for (const identity of [null, {}, { ...owner, userId: '' }, { ...owner, userId: 'another-director' },
    { ...owner, public_verified: false }, { ...owner, public_verified: 'true' },
    { ...owner, public_verified: 1 }, { ...owner, public_badge_key: 'member' },
    { userId: owner.userId, name: '3B', handle: '3binternational', public_title: 'DIRECTEUR · FONDATEUR 3B' }]) {
    assert.equal(officialDirectorPortrait(identity), '');
    assert.equal(matrixPortraitSource(identity, { mode: 'matrix' }), '');
  }
});

test('official portrait is a Matrix fallback and preserves explicit local preferences', () => {
  assert.equal(matrixPortraitSource(owner, { mode: 'matrix', photo: localPhoto }), localPhoto);
  assert.equal(matrixPortraitSource(owner, { mode: 'digital' }), OFFICIAL_DIRECTOR_PORTRAIT);
  for (const mode of ['photo', 'initials', 'name']) {
    assert.equal(matrixPortraitSource(owner, { mode, photo: localPhoto }), '');
  }
  for (const invalid of ['https://example.test/photo.png', OFFICIAL_DIRECTOR_PORTRAIT, 'data:image/svg+xml;base64,YWJj']) {
    assert.equal(normalizeAppearance({ mode: 'matrix', photo: invalid }, owner).photo, '');
    assert.equal(matrixPortraitSource(owner, { mode: 'matrix', photo: invalid }), OFFICIAL_DIRECTOR_PORTRAIT);
  }
});

test('removing a local Matrix photo restores the official source without persisting it', () => {
  const values = new Map();
  const store = createAppearanceStore({
    getStorage: () => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }),
    getEvents: () => undefined,
  });
  store.update(owner, { mode: 'matrix', photo: localPhoto });
  assert.equal(matrixPortraitSource(owner, appearanceFromSnapshot(store.readSnapshot(owner), owner)), localPhoto);
  store.update(owner, { photo: '' });
  const saved = JSON.parse(store.readSnapshot(owner));
  assert.equal(saved.photo, '');
  assert.equal(matrixPortraitSource(owner, saved), OFFICIAL_DIRECTOR_PORTRAIT);
  assert.equal(matrixPortraitSource({ ...owner, public_verified: false }, saved), '');
  assert.equal(matrixPortraitSource({ userId: 'someone-else' }, saved), '');
  assert.equal(matrixPortraitSource(null, saved), '');
});

function imageFixture(outcome = 'load', dimensions = [4, 4]) {
  const sources = [];
  const image = {
    naturalWidth: dimensions[0], naturalHeight: dimensions[1],
    set src(value) {
      sources.push(value);
      if (value && outcome !== 'pending') queueMicrotask(() => {
        if (outcome === 'load') this.onload?.();
        else this.onerror?.();
      });
    },
  };
  return { image, sources, createImage: () => image };
}

test('image loading accepts only a local raster data URL or the exact official asset', async () => {
  for (const source of [OFFICIAL_DIRECTOR_PORTRAIT, localPhoto, 'data:image/png;base64,YWJj', 'data:image/webp;base64,YWJj']) {
    const fixture = imageFixture();
    assert.equal(await loadMatrixPortraitImage(source, fixture), fixture.image);
    assert.deepEqual(fixture.sources, [source]);
    assert.equal(fixture.image.onload, null);
    assert.equal(fixture.image.onerror, null);
  }
  for (const source of ['', null, 'https://example.test' + OFFICIAL_DIRECTOR_PORTRAIT,
    '//' + OFFICIAL_DIRECTOR_PORTRAIT.slice(1), OFFICIAL_DIRECTOR_PORTRAIT + '?url=other',
    '/passport/unapproved.png', 'data:image/svg+xml;base64,YWJj', 'data:image/png;base64,<bad>']) {
    await assert.rejects(loadMatrixPortraitImage(source, { createImage: () => assert.fail('Invalid sources must never load') }), /Photo illisible/);
  }
});

test('a missing official asset or corrupt local image rejects cleanly for the avatar fallback', async () => {
  for (const source of [OFFICIAL_DIRECTOR_PORTRAIT, localPhoto]) {
    const fixture = imageFixture('error');
    await assert.rejects(loadMatrixPortraitImage(source, fixture), /Photo illisible/);
    assert.equal(fixture.image.onload, null);
    assert.equal(fixture.image.onerror, null);
  }
  await assert.rejects(loadMatrixPortraitImage(localPhoto, imageFixture('load', [0, 0])), /Photo illisible/);
});

test('an unavailable portrait stops loading and releases its handlers', async () => {
  const fixture = imageFixture('pending');
  await assert.rejects(loadMatrixPortraitImage(OFFICIAL_DIRECTOR_PORTRAIT, { ...fixture, timeoutMs: 1 }), /Photo illisible/);
  assert.equal(fixture.image.onload, null);
  assert.equal(fixture.image.onerror, null);
  assert.deepEqual(fixture.sources, [OFFICIAL_DIRECTOR_PORTRAIT, '']);
});

test('the public asset contains exactly the approved Matrix artwork', () => {
  const asset = readFileSync(new URL('../public' + OFFICIAL_DIRECTOR_PORTRAIT, import.meta.url));
  assert.equal(createHash('sha256').update(asset).digest('hex'), '54e9db97f1d8366f1d508c2d7fecdcf8c9c0eefd138105bf466e42a498cb75cd');
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
