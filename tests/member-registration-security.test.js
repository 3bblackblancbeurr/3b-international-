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
 assert.match(source,/\/auth\/v1\/token\?grant_type=password/);
 assert.match(source,/member_auth_events/);
 assert.match(source,/member_consents/);
 assert.match(source,/reset-request/);
 assert.match(source,/resend-confirmation/);
 assert.match(source,/gotrue_meta_security/);
 assert.doesNotMatch(source,/email_confirm\s*:\s*true/);
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
});

test('registration schema is service-only and represented in applied migration manifest',()=>{
 const migration=readFileSync('supabase/migrations/20260921171141_member_registration_security_v2.sql','utf8');
 assert.match(migration,/member_consents/);
 assert.match(migration,/member_auth_events/);
 assert.match(migration,/revoke all on public\.member_consents from public,anon,authenticated/);
 const manifest=JSON.parse(readFileSync('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json','utf8'));
 const row=manifest.migrations.find(item=>item.version==='20260921171141');
 assert.equal(row?.sha256,'c1700cb278f74422f839d7bf4a8b68abbf0b3e65cec83281218660f60aba01b3');
 assert.equal(manifest.count,119);
});


test('auth email returns are routed to the member area and cleaned on navigation',()=>{
 const navigation=readFileSync('src/lib/navigation.js','utf8');
 assert.match(navigation,/params\.get\("reset"\) === "1"/);
 assert.match(navigation,/params\.get\("auth"\) === "confirmed"/);
 assert.match(navigation,/url\.searchParams\.delete\("auth"\)/);
 assert.match(navigation,/url\.searchParams\.delete\("reset"\)/);
});
