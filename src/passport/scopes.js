export const PASSPORT_SCOPES = Object.freeze({
  BASIC: 'passport.basic',
  PUBLIC_PROFILE: 'profile.public',
  PROGRESS_READ: 'progress.read',
  ECONOMY_READ: 'economy.read',
  INVENTORY_READ: 'inventory.read',
  CITY_READ: 'city.read',
  COMMUNITY_READ: 'community.read',
  CREATOR_READ: 'creator.read',
});

export const DEFAULT_EXTERNAL_SCOPES = Object.freeze([
  PASSPORT_SCOPES.BASIC,
  PASSPORT_SCOPES.PUBLIC_PROFILE,
]);

const ALL_SCOPES = new Set(Object.values(PASSPORT_SCOPES));

export function normalizePassportScopes(requested = []) {
  if (!Array.isArray(requested)) return [...DEFAULT_EXTERNAL_SCOPES];
  return [...new Set(requested.filter(scope => ALL_SCOPES.has(scope)))];
}

export function isSensitivePassportScope(scope) {
  return [
    PASSPORT_SCOPES.ECONOMY_READ,
    PASSPORT_SCOPES.INVENTORY_READ,
    PASSPORT_SCOPES.CITY_READ,
    PASSPORT_SCOPES.CREATOR_READ,
  ].includes(scope);
}

export function requiresExplicitPassportConsent(requested = []) {
  return normalizePassportScopes(requested).some(isSensitivePassportScope);
}
