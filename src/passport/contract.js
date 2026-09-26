export const PASSPORT_CONTRACT_VERSION = 2;

export const PASSPORT_STATES = Object.freeze([
  'active',
  'suspended',
  'revoked',
]);

export const PASSPORT_SCOPES = Object.freeze({
  BASIC: 'identity.basic',
  PROFILE: 'identity.profile',
  ORIGIN: 'identity.origin',
  PROGRESS: 'progress.read',
  WALLET: 'wallet.read',
  INVENTORY: 'inventory.read',
  WORLD: 'world.play',
  CITY: 'city.manage',
  GAMES: 'games.play',
  NOSBLOC: 'nosbloc.create',
  SHOP: 'shop.member',
  COMMUNITY: 'community.member',
  SPORT: 'sport.member',
});

export const PASSPORT_MODULE_SCOPES = Object.freeze({
  passport: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROFILE, PASSPORT_SCOPES.ORIGIN]),
  world3b: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.ORIGIN, PASSPORT_SCOPES.PROGRESS, PASSPORT_SCOPES.INVENTORY, PASSPORT_SCOPES.WORLD]),
  city3b: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.ORIGIN, PASSPORT_SCOPES.PROGRESS, PASSPORT_SCOPES.WALLET, PASSPORT_SCOPES.INVENTORY, PASSPORT_SCOPES.CITY]),
  nosbloc: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROFILE, PASSPORT_SCOPES.NOSBLOC]),
  games: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROGRESS, PASSPORT_SCOPES.GAMES]),
  shop: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROGRESS, PASSPORT_SCOPES.SHOP]),
  community: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROFILE, PASSPORT_SCOPES.COMMUNITY]),
  sport: Object.freeze([PASSPORT_SCOPES.BASIC, PASSPORT_SCOPES.PROFILE, PASSPORT_SCOPES.SPORT]),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePassportPublicId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  return UUID_PATTERN.test(id) ? id : '';
}

export function formatPassportCode(publicId, kind = 'PASS') {
  const id = normalizePassportPublicId(publicId);
  if (!id) return '';
  const compact = id.replaceAll('-', '').toUpperCase();
  const prefix = kind === 'MEM' ? 'MEM' : 'PASS';
  return `3B-${prefix}-${compact.slice(0, 8)}-${compact.slice(8, 16)}-${compact.slice(16, 24)}-${compact.slice(24, 32)}`;
}

export function isPassportOperational(passport) {
  return Boolean(
    passport?.userId &&
    normalizePassportPublicId(passport?.passportPublicId) &&
    passport?.passportState === 'active',
  );
}

export function publicPassportClaim(identity, scopes = [PASSPORT_SCOPES.BASIC]) {
  if (!identity || !normalizePassportPublicId(identity.passportPublicId)) return null;
  const requested = new Set(Array.isArray(scopes) ? scopes : []);
  const claim = {
    type: '3BPassportCredential',
    version: PASSPORT_CONTRACT_VERSION,
    subject: identity.passportId,
    passportPublicId: identity.passportPublicId,
    passportState: identity.passportState,
    issuedAt: identity.issuedAt || null,
  };

  if (requested.has(PASSPORT_SCOPES.PROFILE)) {
    claim.profile = {
      handle: identity.handle || '',
      name: identity.name || '',
      publicVerified: identity.public_verified === true,
      publicTitle: identity.public_title || '',
    };
  }

  if (requested.has(PASSPORT_SCOPES.ORIGIN)) {
    claim.origin = {
      country: identity.country,
      countryCode: identity.countryCode,
      value: identity.value,
    };
  }

  return Object.freeze(claim);
}
