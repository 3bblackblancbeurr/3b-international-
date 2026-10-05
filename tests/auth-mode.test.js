import test from 'node:test';
import assert from 'node:assert/strict';
import {
 readInitialAuthState, rememberAuthMode, registrationCompletedState, resolveInitialAuthState
} from '../src/loyalty/auth-mode.js';

function browserWithStorage(search = '') {
 const values = new Map();
 return {
  location: {search},
  sessionStorage: {
   getItem: key => values.get(key) ?? null,
   setItem: (key, value) => values.set(key, value),
   removeItem: key => values.delete(key)
  }
 };
}

test('confirmed email returns to login despite a previous registration intent', () => {
 const browser = browserWithStorage('?auth=confirmed');
 rememberAuthMode('register', browser);
 const state = readInitialAuthState(browser);
 assert.equal(state.mode, 'login');
 assert.match(state.notice, /Adresse e-mail confirmée/);
 rememberAuthMode(state.mode, browser);
 assert.equal(browser.sessionStorage.getItem('3b-auth-intent'), null);
 browser.location.search = '';
 assert.equal(readInitialAuthState(browser).mode, 'login');
});

test('password reset takes priority over confirmation and stale registration intent', () => {
 for (const search of ['?reset=1', '?auth=confirmed&reset=1', '?reset=1&auth=confirmed']) {
  assert.deepEqual(resolveInitialAuthState(search, 'register'), {mode: 'reset-password', notice: ''});
 }
});

test('an email callback error in the fragment cannot announce successful confirmation', () => {
 for (const hash of [
  '#error=access_denied',
  '#error_code=otp_expired',
  '#error_description=Untrusted%20external%20message',
  '#error=&error=access_denied'
 ]) {
  const browser = browserWithStorage('?auth=confirmed');
  browser.location.hash = hash;
  rememberAuthMode('register', browser);
  const state = readInitialAuthState(browser);
  assert.equal(state.mode, 'login');
  assert.equal(state.notice, '');
  assert.equal(state.error, 'Ce lien n’a pas pu être validé. Demande un nouveau message ou reconnecte-toi.');
  assert.doesNotMatch(state.error, /confirmée|Untrusted/);
 }
});

test('query callback errors suppress success even when the auth marker is confirmed', () => {
 for (const query of ['error=access_denied', 'error_code=otp_expired', 'error_description=Untrusted']) {
  const state = resolveInitialAuthState('?auth=confirmed&'+query, 'register');
  assert.equal(state.mode, 'login');
  assert.equal(state.notice, '');
  assert.match(state.error, /n’a pas pu être validé/);
  assert.doesNotMatch(state.error, /confirmée|Untrusted/);
 }
});

test('a failed recovery callback keeps reset priority and reports no success', () => {
 for (const [search, hash] of [
  ['?reset=1&auth=confirmed', '#error_code=otp_expired'],
  ['?auth=confirmed&reset=1&error=access_denied', '']
 ]) {
  const state = resolveInitialAuthState(search, 'register', hash);
  assert.equal(state.mode, 'reset-password');
  assert.equal(state.notice, '');
  assert.match(state.error, /n’a pas pu être validé/);
 }
});

test('an intentional registration persists until the member switches to another mode', () => {
 const browser = browserWithStorage();
 rememberAuthMode('register', browser);
 assert.deepEqual(readInitialAuthState(browser), {mode: 'register', notice: ''});
 for (const mode of ['login', 'reset-request', 'recover', 'reset-password']) {
  rememberAuthMode('register', browser);
  rememberAuthMode(mode, browser);
  assert.equal(readInitialAuthState(browser).mode, 'login');
 }
 assert.equal(resolveInitialAuthState('?auth=unknown', 'register').mode, 'register');
});

test('server rendering and denied browser storage do not block confirmation or reset', () => {
 assert.deepEqual(readInitialAuthState(null), {mode: 'login', notice: ''});
 assert.doesNotThrow(() => rememberAuthMode('login', null));
 const browser = {
  location: {search: '?auth=confirmed'},
  get sessionStorage() { throw new Error('SecurityError'); }
 };
 assert.equal(readInitialAuthState(browser).mode, 'login');
 assert.match(readInitialAuthState(browser).notice, /confirmée/);
 assert.doesNotThrow(() => rememberAuthMode('register', browser));
 browser.location.search = '?reset=1';
 assert.equal(readInitialAuthState(browser).mode, 'reset-password');
 const unavailable = {get location() { throw new Error('unavailable'); }};
 assert.deepEqual(readInitialAuthState(unavailable), {mode: 'login', notice: ''});
});

test('a created account without a session is ready for login with no retained password', () => {
 const browser = browserWithStorage();
 rememberAuthMode('register', browser);
 const before = {handle: 'kais3b', email: ' MEMBER@EXAMPLE.COM ', password: 'private', passwordConfirm: 'private'};
 const next = registrationCompletedState(before.email);
 const fields = {...before, ...next.fields};
 assert.equal(next.mode, 'login');
 assert.match(next.notice, /Vérifie ton e-mail, puis connecte-toi/);
 assert.equal(fields.identifier, 'member@example.com');
 assert.equal(fields.password, '');
 assert.equal(fields.passwordConfirm, '');
 assert.equal(fields.handle, before.handle);
 rememberAuthMode(next.mode, browser);
 assert.equal(readInitialAuthState(browser).mode, 'login');
});

test('successful registration with a real session also clears registration mode', () => {
 const next = registrationCompletedState('member@example.com', true);
 assert.equal(next.mode, 'login');
 assert.equal(next.notice, 'Compte créé et connecté.');
 assert.equal(next.fields.password, '');
 assert.equal(next.fields.passwordConfirm, '');
});
