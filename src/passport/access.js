export function hasPassportAccess(passport) {
  return Boolean(passport?.userId);
}
