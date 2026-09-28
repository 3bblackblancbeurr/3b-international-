import {IDENTITY_ASSURANCE_RANK} from './identity.js';

export function hasPassportAccess(passport) {
  return Boolean(passport?.userId && passport?.passportState === 'active');
}

export function hasVerifiedIdentity(passport, minimumAssurance = 'identity_verified') {
  const current = IDENTITY_ASSURANCE_RANK[passport?.identityAssuranceLevel] ?? -1;
  const requested = typeof minimumAssurance === 'number'
    ? minimumAssurance
    : IDENTITY_ASSURANCE_RANK[minimumAssurance] ?? IDENTITY_ASSURANCE_RANK.identity_verified;
  return passport?.identityVerificationStatus === 'verified'
    && current >= Math.max(IDENTITY_ASSURANCE_RANK.identity_verified, requested);
}

export function canUseSensitivePassportService(passport, minimumAssurance = 'identity_verified') {
  return hasPassportAccess(passport) && hasVerifiedIdentity(passport, minimumAssurance);
}
