import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blankHealth } from '../src/health/model.js';
import {
  HEALTH_VAULT_KEY,
  HEALTH_VAULT_ITERATIONS,
  createHealthVault,
  openHealthVault,
  sealHealthVault,
} from '../src/health/secureVault.js';

test('local health vault uses PBKDF2 and AES-GCM without putting personal entries in cleartext', async () => {
  const data = {
    ...blankHealth(),
    days: { '2026-10-15': { sleepHours: 7.5, energy: 'personnel-et-prive', steps: 2400 } },
  };
  const original = JSON.stringify(data);
  const { envelope, key } = await createHealthVault(data, 'phrase longue et unique 3B !');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.algorithm, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256');
  assert.equal(envelope.iterations, HEALTH_VAULT_ITERATIONS);
  assert.equal(HEALTH_VAULT_KEY, 'threeb_health_vault_v1');
  assert.ok(!JSON.stringify(envelope).includes('personnel-et-prive'));
  assert.ok(!JSON.stringify(envelope).includes('2026-10-15'));
  const opened = await openHealthVault(envelope, 'phrase longue et unique 3B !');
  assert.deepEqual(opened.data, data);
  assert.equal(JSON.stringify(opened.data), original);
  const updated = await sealHealthVault({ ...data, favorites: ['salade'] }, key, envelope.salt);
  assert.notEqual(updated.iv, envelope.iv, 'each write needs a fresh nonce');
  assert.notEqual(updated.ciphertext, envelope.ciphertext);
  assert.deepEqual((await openHealthVault(updated, 'phrase longue et unique 3B !')).data.favorites, ['salade']);
});

test('wrong passphrase, tampering and invalid vault metadata fail closed without plaintext fallback', async () => {
  const { envelope } = await createHealthVault(blankHealth(), 'phrase tres longue de test !');
  await assert.rejects(openHealthVault(envelope, 'mauvais-mot-de-passe'), /incorrecte|endommagé/);
  await assert.rejects(openHealthVault({ ...envelope, iterations: 1 }, 'phrase tres longue de test !'), /inconnu/);
  await assert.rejects(openHealthVault({ ...envelope, iv: 'AA==' }, 'phrase tres longue de test !'), /illisible/);
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  bytes[0] ^= 1;
  await assert.rejects(openHealthVault({ ...envelope, ciphertext: bytes.toString('base64') }, 'phrase tres longue de test !'), /incorrecte|endommagé/);
  await assert.rejects(createHealthVault(blankHealth(), 'court'), /12 caractères/);
});

test('health UI never exposes a password-less opt-in for new plaintext backups', () => {
  const hook = readFileSync(new URL('../src/health/useHealth.js', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/health/HealthPage.jsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/health/HealthVaultPanel.jsx', import.meta.url), 'utf8');
  assert.ok(hook.includes('createHealthVault('));
  assert.ok(hook.includes("vaultMode === 'legacy'"), 'legacy data must be preserved for explicit migration');
  assert.ok(hook.includes('storage.removeItem(HEALTH_STORAGE_KEY)'), 'plaintext copy must be removed on migration');
  assert.ok(hook.includes('revisionRef.current'), 'in-flight writes need cancellation on lock/erase');
  assert.ok(page.includes("health.vaultMode === 'locked'"), 'locked vault cannot silently display empty personal data');
  assert.ok(!page.includes('health.setSaved(true)'), 'no insecure new backup choice may remain');
  assert.ok(panel.includes('health.importEncryptedVault('), 'encrypted exports need a restoration path');
});
