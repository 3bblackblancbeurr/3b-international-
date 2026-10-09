import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNativeBack, closeActiveDialog } from '../src/native/back-navigation.js';

test('native back cancels an open native dialog before dispatching a shared-modal escape', () => {
  const calls=[];
  const dialog={dispatchEvent(event){calls.push([event.type,event.cancelable]);return false;},close(){calls.push('close');}};
  const document={querySelector(selector){return selector==='dialog[open]'?dialog:null;}};
  assert.equal(closeActiveDialog(document,()=>calls.push('escape')),true);
  assert.deepEqual(calls,[['cancel',true]]);
});

test('native back dismisses shared help and settings modals without consuming route history', () => {
  let escapes=0;
  const document={querySelector(selector){return selector.startsWith('.gm-modal')?{}:null;}};
  assert.equal(closeActiveDialog(document,()=>escapes++),true);
  assert.equal(escapes,1);
  assert.equal(closeActiveDialog({querySelector(){return null;}},()=>escapes++),false);
  assert.equal(escapes,1);
});

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
