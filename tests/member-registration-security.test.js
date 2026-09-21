import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  accountEmail,normalizeEmail,passwordRequirements,validateLogin,validateRegistration
} from '../shared/loyalty.js';

const valid={
 handle:'kais3b',email:'member@example.com',emailConfirm:'member@example.com',
 password:'Heritage3B!secure',passwordConfirm:'Heritage3B!secure',
 name:'Kaïs',country:'France',termsAccepted:true,privacyAccepted:true,
 marketingOptIn:false,website:''
};

test('new registration requires real matching email, strong password and mandatory consents',()=>{
 const result=validateRegistration(valid);
 assert.equal(result.email,'member@example.com');
 assert.equal(result.handle,'kais3b');
 assert.throws(()=>validateRegistration({...valid,emailConfirm:'other@example.com'}),/adresses e-mail/);
 assert.throws(()=>validateRegistration({...valid,password:'passwordpassword',passwordConfirm:'passwordpassword'}),/majuscule/);
 assert.throws(()=>validateRegistration({...valid,termsAccepted:false}),/conditions/);
 assert.throws(()=>validateRegistration({...valid,privacyAccepted:false}),/confidentialité/);
 assert.throws(()=>validateRegistration({...valid,email:'u.kais3b@accounts.3b.invalid',emailConfirm:'u.kais3b@accounts.3b.invalid'}),/vraie adresse/);
});

test('password requirements expose all five strength gates',()=>{
 assert.deepEqual(passwordRequirements('Abcdefghij1!'),{length:true,lower:true,upper:true,digit:true,symbol:true});
 assert.equal(passwordRequirements('abcdefghijk1').upper,false);
});

test('login remains compatible with legacy handles while accepting real email',()=>{
 assert.equal(validateLogin({identifier:'kais3b',password:'x'}).isEmail,false);
 assert.equal(validateLogin({identifier:'member@example.com',password:'x'}).isEmail,true);
 assert.equal(accountEmail('kais3b'),'u.kais3b@accounts.3b.invalid');
 assert.equal(normalizeEmail(' MEMBER@EXAMPLE.COM '),'member@example.com');
});

test('member auth source uses public signup, generic login and service-only audit trail',()=>{
 const source=readFileSync('supabase/functions/member-auth/index.ts','utf8');
 assert.match(source,/\/auth\/v1\/signup/);
 assert.match(source,/register-v2/);
 assert.match(source,/recover-v2/);
 assert.match(source,/member_auth_settings/);
 assert.match(source,/\/auth\/v1\/token\?grant_type=password/);
 assert.match(source,/member_auth_events/);
 assert.match(source,/member_consents/);
 assert.match(source,/reset-request/);
 assert.match(source,/resend-confirmation/);
 assert.match(source,/gotrue_meta_security/);
 assert.match(source,/const user=rawSignup\?\.user\?\.id\?rawSignup\.user:rawSignup\?\.id\?rawSignup:null/);
 assert.match(source,/const signupSession=rawSignup\?\.session\|\|\(rawSignup\?\.access_token&&rawSignup\?\.refresh_token\?rawSignup:null\)/);
 assert.doesNotMatch(source,/register-v2[\s\S]{0,250}email_confirm\s*:\s*true/);
});

test('registration UI exposes email confirmation, two recovery paths and legal consent',()=>{
 const page=readFileSync('src/loyalty/AccountPage.jsx','utf8');
 assert.match(page,/Adresse e-mail/);
 assert.match(page,/Confirmer l’e-mail/);
 assert.match(page,/J’ai une clé de secours/);
 assert.match(page,/Récupération par e-mail/);
 assert.match(page,/account-terms\.html/);
 assert.match(page,/privacy-policy\.html/);
 assert.match(page,/TurnstileField/);
 assert.match(page,/memberRequest\('register-v2'/);
 assert.match(page,/memberRequest\('recover-v2'/);
});

test('confirmed email callback forces login mode and clears stale register intent',()=>{
 const page=readFileSync('src/loyalty/AccountPage.jsx','utf8');
 assert.match(page,/params\.get\('auth'\)==='confirmed'\)return'login'/);
 assert.match(page,/sessionStorage\.removeItem\('3b-auth-intent'\)/);
 assert.match(page,/Adresse e-mail confirmée\. Connecte-toi avec ton e-mail et ton mot de passe\./);
 assert.match(page,/setMode\('login'\)/);
 assert.match(page,/identifier:email/);
});

test('registration schema is service-only and represented in applied migration manifest',()=>{
 const migration=readFileSync('supabase/migrations/20260921171141_member_registration_security_v2.sql','utf8');
 assert.match(migration,/member_consents/);
 assert.match(migration,/member_auth_events/);
 assert.match(migration,/revoke all on public\.member_consents from public,anon,authenticated/);
 const manifest=JSON.parse(readFileSync('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json','utf8'));
 const row=manifest.migrations.find(item=>item.version==='20260921171141');
 assert.equal(row?.sha256,'c1700cb278f74422f839d7bf4a8b68abbf0b3e65cec83281218660f60aba01b3');
 assert.equal(manifest.count,manifest.migrations.length);
 assert.ok(manifest.count>=120);
});

test('auth email returns are routed to the member area and cleaned on navigation',()=>{
 const navigation=readFileSync('src/lib/navigation.js','utf8');
 assert.match(navigation,/params\.get\("reset"\) === "1"/);
 assert.match(navigation,/params\.get\("auth"\) === "confirmed"/);
 assert.match(navigation,/url\.searchParams\.delete\("auth"\)/);
 assert.match(navigation,/url\.searchParams\.delete\("reset"\)/);
});

test('zero-downtime auth rollout gate is service-only and removable after v2 frontend cutover',()=>{
 const migration=readFileSync('supabase/migrations/20260921172824_member_auth_rollout_gate_v1.sql','utf8');
 assert.match(migration,/member_auth_settings/);
 assert.match(migration,/allow_legacy_flows boolean not null default true/);
 assert.match(migration,/revoke all on public\.member_auth_settings from public,anon,authenticated/);
 const source=readFileSync('supabase/functions/member-auth/index.ts','utf8');
 assert.match(source,/allow_legacy_flows/);
 assert.match(source,/Cette version de l’application doit être mise à jour/);
 const manifest=JSON.parse(readFileSync('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json','utf8'));
 const row=manifest.migrations.find(item=>item.version==='20260921172824');
 assert.equal(row?.sha256,'2b817049381abf7b537d28d9c14efc0dfa95d803bdd7968cb35e92778f72d093');
 assert.equal(manifest.count,manifest.migrations.length);
 assert.ok(manifest.count>=120);
});
