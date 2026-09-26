const PUBLIC_PREFIX = '3B-PASS';

const clean = (value, max = 96) => String(value ?? '').trim().slice(0, max);

export function normalizePassportPublicId(value) {
  const id = clean(value, 64).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
    ? id
    : null;
}

export function passportNumberFromPublicId(value) {
  const id = normalizePassportPublicId(value);
  if (!id) return null;
  return `${PUBLIC_PREFIX}-${id.replaceAll('-', '').slice(0, 16).toUpperCase()}`;
}

export function createPassportCredentialSubject(identity, registry) {
  if (!identity?.userId || !identity?.countryCode) return null;
  const publicId = normalizePassportPublicId(registry?.passport_public_id);
  if (!publicId) return null;

  return Object.freeze({
    id: `urn:3b:passport:${publicId}`,
    passportNumber: passportNumberFromPublicId(publicId),
    memberHandle: clean(identity.handle, 24),
    displayName: clean(identity.name, 80),
    countryCode: clean(identity.countryCode, 3),
    heritageValue: clean(identity.value, 32),
    assurance: clean(registry.assurance_level || 'member', 32),
    status: clean(registry.status || 'active', 24),
    credentialVersion: Number(registry.credential_version) || 1,
  });
}

export function canPresentPassportCredential(subject) {
  return Boolean(
    subject?.id &&
    subject?.passportNumber &&
    subject?.status === 'active' &&
    ['member', 'verified', 'high_assurance'].includes(subject?.assurance)
  );
}

export function passportCredentialType() {
  return Object.freeze(['VerifiableCredential', 'ThreeBPassportCredential']);
}
