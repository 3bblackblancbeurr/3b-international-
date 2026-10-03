import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PASSPORT_COUNTRIES,passportFromProfile,passportInitials} from '../src/passport/identity.js';

const UID='123e4567-e89b-12d3-a456-426614174000';
const PUBLIC_ID='8f501f17-07f0-4edc-9cf1-1be8bcb9d507';
const profile=(country='Maroc')=>({
  user_id:UID,
  passport_public_id:PUBLIC_ID,
  passport_issued_at:'2026-09-26T14:58:25.000Z',
  passport_version:2,
  passport_state:'active',
  handle:'amina3b',
  name:'Amina El Mansouri',
  country,
  xp:840,
  points:1250,
  theme:'explorer',
  created_at:'2026-09-20T00:00:00.000Z',
});

test('passport identity is derived from the signed-in member profile',()=>{
 const passport=passportFromProfile(profile(),{id:UID});
 assert.equal(passport.name,'Amina El Mansouri');
 assert.equal(passport.handle,'amina3b');
 assert.equal(passport.country,'Maroc');
 assert.equal(passport.countryCode,'MA');
 assert.equal(passport.value,'Noblesse');
 assert.equal(passport.flag,'🇲🇦');
 assert.equal(passport.xp,840);
 assert.equal(passport.points,1250);
 assert.equal(passport.passportPublicId,PUBLIC_ID.toUpperCase());
 assert.equal(passport.passportId,'3B-PASS-'+PUBLIC_ID.toUpperCase());
 assert.equal(passport.memberId,'3B-MEM-'+PUBLIC_ID.toUpperCase());
 assert.equal(passport.passportVersion,2);
 assert.equal(passport.passportState,'active');
 assert.ok(!passport.passportId.includes(UID.toUpperCase()));
 assert.ok(!passport.memberId.includes(UID.toUpperCase()));
 assert.equal(passportInitials(passport),'AE');
});


test('brand-style short holder names keep the complete Passport monogram',()=>{
 const founder=passportFromProfile({...profile('France'),name:'3B',handle:'3binternational',public_badge_key:'director_founder',public_title:'DIRECTEUR · FONDATEUR 3B',public_verified:true},{id:UID});
 assert.equal(passportInitials(founder),'3B');
 assert.equal(founder.public_badge_key,'director_founder');
 assert.equal(founder.public_title,'DIRECTEUR · FONDATEUR 3B');
 assert.equal(founder.public_verified,true);
});

test('a profile from another authenticated account is rejected',()=>{
 assert.equal(passportFromProfile(profile(),{id:'00000000-0000-0000-0000-000000000000'}),null);
});

test('missing or invalid profile cannot fabricate a passport or country',()=>{
 assert.equal(passportFromProfile(null,{id:UID}),null);
 assert.equal(passportFromProfile({}, {id:UID}),null);
 assert.equal(passportFromProfile({...profile(),country:'Unknown'}, {id:UID}),null);
});

test('the eight canonical countries keep their 3B code and value',()=>{
 assert.deepEqual(
  Object.fromEntries(Object.entries(PASSPORT_COUNTRIES).map(([country,meta])=>[country,[meta.code,meta.value]])),
  {
   France:['FR','Justice'],
   'Algérie':['DZ','Loyauté'],
   Espagne:['ES','Passion'],
   Maroc:['MA','Noblesse'],
   Italie:['IT','Espoir'],
   Tunisie:['TN','Courage'],
   Turquie:['TR','Foi'],
   Estonie:['EE','Sagesse'],
  }
 );
});

test('the live Passport visual contains no baked member artwork',()=>{
 const source=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/passport-digital-3bv2\.png/);
 assert.match(source,/identity\.name/);
 assert.match(source,/identity\.country/);
 assert.match(source,/identity\.passportId/);
});

test('both real City screens use the owned Passport country, without a France fallback',()=>{
 for(const path of ['../src/components/City3BPortal.jsx','../src/city/City3BPanel.jsx']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  if(path.includes('City3BPortal')){
   assert.match(source,/Ton premier quartier : \$\{country\}/);
   assert.doesNotMatch(source,/<select[^>]*country|onChange[^\n]*setCountry/);
  }else{
   assert.match(source,/lié au Passeport 3B/);
   assert.match(source,/readOnly/);
  }
  assert.match(source,/passport\?\.userId===uid/);
  assert.match(source,/'create',\{name:name\.trim\(\),country,map\}/);
  assert.doesNotMatch(source,/setCountry/);
 }
 const gateway=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
 assert.match(gateway,/NexusCityGateway/);
});


test('legacy on-device identity is migration input only, never the active app identity',()=>{
 const source=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(source,/const member = loyalty\.profile \? remoteMember\(loyalty\.profile\) : createTestMember\(\);/);
 assert.match(source,/legacy=\{localMember\}/);
});

test('registration and account switching cannot reuse another member passport',()=> {
 const account=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');
 const context=readFileSync(new URL('../src/loyalty/LoyaltyContext.jsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(account,/memberRequest\('register-v2',\{\.\.\.fields,captchaToken\}\)/);
 assert.match(account,/memberRequest\('login',\{identifier:fields\.identifier,password:fields\.password,captchaToken\}\)/);
 assert.doesNotMatch(account,/signInWithPassword/);
 assert.match(context,/setData\(null\)/);
 assert.match(context,/data\?\.profile\?\.user_id===session\?\.user\?\.id\?data:null/);
 assert.match(context,/passportFromProfile\(owned\?\.profile,session\?\.user\)/);
 assert.match(app,/identity=\{loyalty\.passport\}/);
});
