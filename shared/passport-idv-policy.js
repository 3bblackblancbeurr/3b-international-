// Production civil identity must never be derived from a sandbox provider flow.
export function productionIdentityApproved({physical,logical,flowApproved,legalApproved,retentionApproved,minorsApproved,sandboxApproved,captchaRequired,passwordProtectionConfirmed}) {
 return physical==='production' && logical==='live' &&
  [flowApproved,legalApproved,retentionApproved,minorsApproved,sandboxApproved,captchaRequired,passwordProtectionConfirmed].every(value=>value===true);
}
