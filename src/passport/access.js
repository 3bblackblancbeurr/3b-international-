import { isPassportOperational } from './contract.js';

export function hasPassportAccess(passport) {
  return isPassportOperational(passport);
}
