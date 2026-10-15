// 3B Santé — coffre local facultatif. Aucun réseau, aucune clé envoyée au serveur.
// Les données anciennes en clair sont migrées uniquement après accord de leur propriétaire.
export const HEALTH_VAULT_KEY = 'threeb_health_vault_v1';
export const HEALTH_VAULT_ITERATIONS = 600000;

const codec = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function secureCrypto() {
  if (!globalThis.crypto?.subtle || (typeof window !== 'undefined' && !window.isSecureContext)) {
    throw new Error('Le coffre nécessite une connexion HTTPS et un navigateur compatible.');
  }
  return globalThis.crypto;
}

function toBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(text);
}

function fromBase64(value, maxLength) {
  if (typeof value !== 'string' || !value || value.length > maxLength ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Coffre illisible.');
  try { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }
  catch { throw new Error('Coffre illisible.'); }
}

function validateEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.version !== 1 || value.algorithm !== 'AES-256-GCM' ||
      value.kdf !== 'PBKDF2-SHA-256' || value.iterations !== HEALTH_VAULT_ITERATIONS) {
    throw new Error('Format de coffre inconnu. Aucune donnée n’a été effacée.');
  }
  const salt = fromBase64(value.salt, 28);
  const iv = fromBase64(value.iv, 20);
  const ciphertext = fromBase64(value.ciphertext, 4000000);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) {
    throw new Error('Coffre illisible. Aucune donnée n’a été effacée.');
  }
  return { salt, iv, ciphertext };
}

async function deriveKey(passphrase, salt) {
  const crypto = secureCrypto();
  const baseKey = await crypto.subtle.importKey(
    'raw', codec.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: HEALTH_VAULT_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sealHealthVault(data, key, saltBase64) {
  const crypto = secureCrypto();
  const salt = fromBase64(saltBase64, 28);
  if (salt.length !== 16) throw new Error('Sel cryptographique incorrect.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = codec.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: HEALTH_VAULT_ITERATIONS,
    salt: saltBase64,
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function createHealthVault(data, passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('Choisis une phrase secrète d’au moins 12 caractères.');
  }
  const salt = secureCrypto().getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const envelope = await sealHealthVault(data, key, toBase64(salt));
  return { envelope, key };
}

export async function openHealthVault(envelope, passphrase) {
  const { salt, iv, ciphertext } = validateEnvelope(envelope);
  if (typeof passphrase !== 'string' || !passphrase) throw new Error('Phrase secrète requise.');
  const key = await deriveKey(passphrase, salt);
  try {
    const plaintext = await secureCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ciphertext
    );
    const data = JSON.parse(decoder.decode(plaintext));
    if (!data || data.version !== 1 || !data.days || typeof data.days !== 'object' || Array.isArray(data.days)) {
      throw new Error('Invalid data');
    }
    return { data, key };
  } catch {
    // Ne pas distinguer mauvais mot de passe et coffre altéré (pas de fuite d'oracle).
    throw new Error('Phrase secrète incorrecte ou coffre endommagé. Aucune donnée n’a été modifiée.');
  }
}
