export const IDENTITY_VERIFICATION_STATUSES = Object.freeze([
  'unverified',
  'pending',
  'verified',
  'review_required',
  'rejected',
  'expired',
  'revoked',
]);

export const IDENTITY_ASSURANCE_LEVELS = Object.freeze([
  'account',
  'email',
  'document',
  'document_liveness',
  'high',
]);

const VERIFIED_LEVELS = new Set(['document','document_liveness','high']);

const clean = (value,max=64) => String(value ?? '').trim().slice(0,max);
const isoOrNull = value => {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

export function normalizeIdentityAssurance(profile = {}, now = new Date()) {
  let status = IDENTITY_VERIFICATION_STATUSES.includes(profile.identity_verification_status)
    ? profile.identity_verification_status
    : 'unverified';
  const level = IDENTITY_ASSURANCE_LEVELS.includes(profile.identity_assurance_level)
    ? profile.identity_assurance_level
    : 'account';
  const verifiedAt = isoOrNull(profile.identity_verified_at);
  const expiresAt = isoOrNull(profile.identity_verification_expires_at);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const expired = status === 'verified' && expiresAt && Number.isFinite(nowMs) && Date.parse(expiresAt) <= nowMs;
  if (expired) status = 'expired';

  const civilIdentityVerified =
    status === 'verified' &&
    VERIFIED_LEVELS.has(level) &&
    Boolean(verifiedAt);

  return Object.freeze({
    status,
    level,
    civilIdentityVerified,
    verifiedAt,
    expiresAt,
    ageOver18: profile.identity_age_over_18 === true,
    documentVerified: profile.identity_document_verified === true,
    livenessVerified: profile.identity_liveness_verified === true,
    provider: clean(profile.identity_verification_provider,48) || null,
  });
}

export function isCivilIdentityVerified(input, now = new Date()) {
  if (!input) return false;
  if (input.civilIdentityVerified === true && input.identityVerificationExpiresAt) {
    const expiry = Date.parse(input.identityVerificationExpiresAt);
    const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
    return Number.isFinite(expiry) && Number.isFinite(nowMs) ? expiry > nowMs : false;
  }
  if (input.civilIdentityVerified === true) return true;
  return normalizeIdentityAssurance(input, now).civilIdentityVerified;
}
