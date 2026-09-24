import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuditUrl } from '../server/pwa-audit.js';

test('normalizeAuditUrl ajoute https quand le protocole manque', () => {
  assert.equal(normalizeAuditUrl('example.com').toString(), 'https://example.com/');
});

test('normalizeAuditUrl conserve https et retire le fragment', () => {
  assert.equal(normalizeAuditUrl('https://example.com/app#test').toString(), 'https://example.com/app');
});

test('normalizeAuditUrl retire les identifiants intégrés', () => {
  assert.equal(normalizeAuditUrl('https://user:pass@example.com/path').toString(), 'https://example.com/path');
});

test('normalizeAuditUrl refuse les protocoles non web', () => {
  assert.throws(() => normalizeAuditUrl('file:///etc/passwd'), /HTTP/);
});

test('normalizeAuditUrl refuse une valeur vide', () => {
  assert.throws(() => normalizeAuditUrl('   '), /adresse/i);
});
