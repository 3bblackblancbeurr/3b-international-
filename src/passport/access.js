export function hasPassportAccess(passport) {
  return Boolean(
    passport?.userId &&
    passport?.passportPublicId &&
    passport?.passportState === 'active'
  );
}
