export function hasPassportAccess(passport) {
  return Boolean(passport?.userId && passport?.passportState === 'active');
}

export function hasVerifiedPassportAccess(passport) {
  return hasPassportAccess(passport) && passport?.civilIdentityVerified === true;
}
