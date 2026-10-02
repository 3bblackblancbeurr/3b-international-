// Client-side checks improve presentation only. The server verifies all proofs.
import { decodeBase64url, PROOF_TYPE, validatePayload } from '../../shared/passport-recognition.js';
export class PassportVerificationError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'PassportVerificationError'; this.status = status; }
}

export const presentationForOwner = (value, userId, active) => active && userId && value?.ownerUserId === userId ? value : null;

export function remainingSeconds(expiresAt, now = Date.now()) {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
}

export function randomChallenge(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new PassportVerificationError('Le navigateur ne permet pas de créer un code sécurisé.');
  return Array.from(cryptoApi.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}

export function safeHttpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function validateTicket(result, now = Date.now()) {
  const url = safeHttpsUrl(result?.verifyUrl);
  if (!url || !/^[0-9a-f]{64}$/i.test(new URLSearchParams(new URL(url).hash.slice(1)).get('ticket') || '') ||
      !/^data:image\/(?:png|svg\+xml)[;,]/i.test(result?.qrDataUrl || '') ||
      remainingSeconds(result?.expiresAt, now) <= 0 || remainingSeconds(result?.expiresAt, now) > 301) {
    throw new PassportVerificationError('Le serveur a retourné un code de présentation incomplet. Réessaie.');
  }
  return result;
}

export function validateProof(result, now = Date.now()) {
  if (typeof result?.proofId !== 'string' || !result.proofId ||
      typeof result?.proofJWT !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(result.proofJWT) ||
      remainingSeconds(result?.expiresAt, now) <= 0) {
    throw new PassportVerificationError('L’attestation n’a pas été émise correctement. Aucune preuve ne sera créée sur cet appareil.');
  }
  // Check the private 3B profile and response consistency, without claiming to
  // have verified the signature. Partner-side online verification is required.
  try {
    if (result.proofJWT.length > 16384) throw Error('Proof too large');
    const [headerPart, payloadPart, signaturePart] = result.proofJWT.split('.');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const header = JSON.parse(decoder.decode(decodeBase64url(headerPart)));
    if (header.alg !== 'ES256' || header.typ !== PROOF_TYPE || !/^[A-Za-z0-9._-]{1,64}$/.test(header.kid || '') || Object.keys(header).length !== 3 || decodeBase64url(signaturePart).length !== 64) throw Error('Invalid type');
    const payload = validatePayload(JSON.parse(decoder.decode(decodeBase64url(payloadPart))), { now: Math.floor(now / 1000) });
    if (payload.jti !== result.proofId || Math.abs(Date.parse(result.expiresAt) - payload.exp * 1000) >= 1000 || typeof result.partnerName !== 'string' || !result.partnerName.trim()) throw Error('Inconsistent response');
  } catch {
    throw new PassportVerificationError('Le format de cette attestation 3B est incohérent. Demande une nouvelle émission au serveur.');
  }
  return result;
}

export function validateRegistry(result) {
  if (typeof result?.readiness?.ready !== 'boolean' || !Array.isArray(result?.partners) || !Array.isArray(result?.proofs) ||
      result.partners.some(partner => typeof partner?.id !== 'string' || typeof partner?.name !== 'string' || !Array.isArray(partner?.scopes)) ||
      result.proofs.some(proof => typeof proof?.id !== 'string' || !Array.isArray(proof?.scopes))) {
    throw new PassportVerificationError('Le registre partenaire n’a pas retourné un état complet.', 503);
  }
  return result;
}

export function validateProofRequest({ partnerId, scopes, nonce, consent }, partner) {
  if (!partner || partner.id !== partnerId) throw new PassportVerificationError('Sélectionne un partenaire actif.');
  if (consent !== true) throw new PassportVerificationError('Ton consentement explicite est requis.');
  if (!Array.isArray(scopes) || scopes.length === 0 || new Set(scopes).size !== scopes.length ||
      scopes.some(scope => !partner.scopes.includes(scope))) throw new PassportVerificationError('Choisis uniquement les informations acceptées par ce partenaire.');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(nonce || '')) throw new PassportVerificationError('Utilise le code de demande fourni par le partenaire (32 à 128 caractères).');
  return { partnerId, scopes, nonce, consent: true };
}

export function proofState(proof, now = Date.now()) {
  if (proof?.revokedAt || proof?.status === 'revoked') return 'revoked';
  if (proof?.consumedAt || proof?.status === 'consumed') return 'consumed';
  if (proof?.status === 'expired') return 'expired';
  if (!remainingSeconds(proof?.expiresAt || proof?.expires_at, now)) return 'expired';
  return 'issued';
}
