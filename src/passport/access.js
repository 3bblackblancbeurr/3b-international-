export function hasPassportAccess(passport) {
  if (!passport?.userId) return false;
  return (passport.passportState || 'active') === 'active';
}
