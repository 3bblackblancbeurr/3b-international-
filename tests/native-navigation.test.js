import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNativeBack } from '../src/native/back-navigation.js';

function environment(overrides = {}) {
  const calls = [];
  return { calls, options: {
    canGoBack: false, page: 'home', closeDialog: () => false,
    back: () => calls.push('back'), home: () => calls.push('home'), exit: () => calls.push('exit'),
    ...overrides,
  } };
}

test('Android back dismisses a dialog before leaving its page', () => {
  const { calls, options } = environment({ canGoBack: true, closeDialog: () => true });
  assert.equal(handleNativeBack(options), 'dialog');
  assert.deepEqual(calls, []);
});

test('Android back follows the existing route history', () => {
  const { calls, options } = environment({ canGoBack: true, page: 'games' });
  assert.equal(handleNativeBack(options), 'back');
  assert.deepEqual(calls, ['back']);
});

test('a page without history returns home instead of closing the app', () => {
  const { calls, options } = environment({ page: 'member' });
  assert.equal(handleNativeBack(options), 'home');
  assert.deepEqual(calls, ['home']);
});

test('only a root page without history can close the Android app', () => {
  for (const page of ['intro', 'home']) {
    const { calls, options } = environment({ page });
    assert.equal(handleNativeBack(options), 'exit');
    assert.deepEqual(calls, ['exit']);
  }
});
