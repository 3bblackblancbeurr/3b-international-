export function hasPassportAccess(passport) {
  return Boolean(passport?.userId && passport?.passportState === 'active');
}

export function hasVerifiedIdentity(passport, minimumAssurance = 1) {
  const level = Number(passport?.identityAssuranceLevel);
  return passport?.identityVerificationStatus === 'verified'
    && Number.isInteger(level)
    && level >= Math.max(1, Number(minimumAssurance) || 1);
}

export function canUseSensitivePassportService(passport, minimumAssurance = 2) {
  return hasPassportAccess(passport) && hasVerifiedIdentity(passport, minimumAssurance);
}
