import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('existing members can complete civil claims through authenticated member-api only',()=>{
 const api=readFileSync('supabase/functions/member-api/index.ts','utf8');
 assert.match(api,/action==='identity-claim'/);
 assert.match(api,/validateIdentityClaim/);
 assert.match(api,/member_identity_claims/);
 assert.match(api,/member_consents/);
 assert.match(api,/IDENTITY_CONSENT_VERSION/);
 assert.match(api,/\['pending','verified'\]/);
 assert.match(api,/identity_verification_state:'unverified'/);
 assert.match(api,/identity_claims_complete/);
});

test('snapshot returns only completion state and never civil claim values',()=>{
 const api=readFileSync('supabase/functions/member-api/index.ts','utf8');
 assert.match(api,/select=user_id&limit=1/);
 assert.doesNotMatch(api,/select=legal_given_names/);
 assert.doesNotMatch(api,/select=legal_family_name/);
 assert.doesNotMatch(api,/select=birth_date/);
});

test('account UI supports old accounts without labelling self-declared data as verified',()=>{
 const page=readFileSync('src/loyalty/AccountPage.jsx','utf8');
 assert.match(page,/Compléter mon identité civile/);
 assert.match(page,/memberRequest\('identity-claim'/);
 assert.match(page,/ne signifie pas que l’identité est vérifiée/);
 assert.match(page,/Aucune identité civile n’est considérée vérifiée sans preuve externe/);
});

test('loyalty context exposes only the identity-claim completion boolean',()=>{
 const context=readFileSync('src/loyalty/LoyaltyContext.jsx','utf8');
 assert.match(context,/identityClaimsComplete:owned\?\.identity_claims_complete===true/);
});
