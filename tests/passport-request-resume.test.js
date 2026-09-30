import test from 'node:test';
import assert from 'node:assert/strict';
import {createPassportRequestResume,PASSPORT_REQUEST_RESUME_MS,removePassportRequestFromUrl} from '../src/passport/request-resume.js';
const token='a4'.repeat(32),other='b5'.repeat(32);
function fixture(){let time=0;return{resume:createPassportRequestResume({clock:()=>time}),advance(ms){time+=ms;}};}

test('an anonymous request survives navigation to member and resumes once for the newly connected account',()=>{
 const {resume}=fixture();assert.equal(resume.capture(token),true);assert.equal(resume.read(),token);
 assert.equal(resume.waitForLogin(),true);assert.equal(resume.read('account-a'),null,'no anonymous request is exposed to an account before binding');
 assert.deepEqual(resume.sessionChanged('account-a',{page:'member',loading:true}),{changed:false,returnToPassport:false});
 assert.deepEqual(resume.sessionChanged('account-a',{page:'member'}),{changed:true,returnToPassport:true});assert.equal(resume.read('account-a'),token);
 assert.deepEqual(resume.sessionChanged('account-a',{page:'passport'}),{changed:false,returnToPassport:false});
});

test('a request is erased at logout or account change and cannot follow a later account',()=>{
 for(const replacement of [null,'account-b']){const {resume}=fixture();resume.capture(token,'account-a');assert.equal(resume.read(replacement),null);assert.equal(resume.sessionChanged(replacement,{page:'passport',loading:true}).changed,true);assert.equal(resume.read('account-a'),null);resume.sessionChanged('account-c',{page:'member'});assert.equal(resume.read('account-c'),null);}
});

test('the memory lifetime is at most 180 seconds and cannot be renewed by a re-render',()=>{
 const {resume,advance}=fixture();assert.equal(PASSPORT_REQUEST_RESUME_MS,180000);resume.capture(token);resume.waitForLogin();advance(179999);assert.equal(resume.capture(token),false);assert.equal(resume.remaining(),1);advance(1);
 assert.deepEqual(resume.sessionChanged('account-a',{page:'member'}),{changed:true,returnToPassport:false});assert.equal(resume.remaining(),0);assert.equal(resume.read('account-a'),null);
});

test('handling an approval or refusal clears only the matching request and owner',()=>{
 const {resume}=fixture();resume.capture(token,'account-a');assert.equal(resume.handled(other,'account-a'),false);assert.equal(resume.handled(token,'account-b'),false);assert.equal(resume.read('account-a'),token);assert.equal(resume.handled(token,'account-a'),true);assert.equal(resume.read('account-a'),null);
 resume.capture(other,'account-a');assert.equal(resume.handled(token,'account-a'),false);assert.equal(resume.read('account-a'),other,'a late callback cannot remove a newer request');
});

test('an existing account opening account management is not redirected automatically',()=>{
 const {resume}=fixture();resume.capture(token,'account-a');assert.equal(resume.waitForLogin('account-a'),false);assert.equal(resume.sessionChanged('account-a',{page:'member'}).returnToPassport,false);
});

test('a login on a different page binds the owner without taking over navigation',()=>{
 const {resume}=fixture();resume.capture(token);resume.waitForLogin();assert.equal(resume.sessionChanged('account-a',{page:'home'}).returnToPassport,false);assert.equal(resume.read('account-a'),token);assert.equal(resume.sessionChanged('account-a',{page:'member'}).returnToPassport,false);
});

test('a new App reference has no durable request and malformed tokens cannot be retained',()=>{
 const a=fixture().resume;a.capture(token);const b=fixture().resume;assert.equal(b.read(),null);for(const bad of [null,'A4'.repeat(32),'a4'.repeat(31),token+'xx','invalid'])assert.equal(b.capture(bad),false);assert.equal(b.remaining(),0);
});

test('capturing removes the token from the incoming URL without losing its page or account recovery',()=>{
 const cleaned=removePassportRequestFromUrl('https://app.example/?page=passport&passport_request='+token+'#accueil','passport');assert.equal(cleaned,'/#passeport');assert.equal(cleaned.includes(token),false);
 const reset=removePassportRequestFromUrl('https://app.example/?reset=1&passport_request='+token+'#passeport','member');assert.equal(reset,'/?reset=1#membre');
});
