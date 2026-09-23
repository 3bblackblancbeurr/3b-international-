import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captchaChallengeReducer as reduce} from '../src/loyalty/captcha-state.js';

test('renewing a submitted challenge clears its token and requests a new widget',()=>{
  let state={attempt:0,token:''};
  state=reduce(state,{type:'token',attempt:0,token:'first-token'});
  assert.equal(state.token,'first-token');
  state=reduce(state,{type:'reset'});
  assert.deepEqual(state,{attempt:1,token:''});
  state=reduce(state,{type:'token',attempt:1,token:'fresh-token'});
  assert.deepEqual(state,{attempt:1,token:'fresh-token'});
});

test('callbacks from a consumed widget cannot set or clear the next challenge token',()=>{
  let state=reduce({attempt:7,token:'consumed'},{type:'reset'});
  for(const token of ['late-old-token','']){
    assert.equal(reduce(state,{type:'token',attempt:7,token}),state);
  }
  state=reduce(state,{type:'token',attempt:8,token:'fresh'});
  assert.equal(reduce(state,{type:'token',attempt:7,token:''}),state);
  assert.deepEqual(reduce(state,{type:'token',attempt:8,token:''}),{attempt:8,token:''});
});

test('repeated retries never reuse a challenge generation',()=>{
  let state={attempt:0,token:'used'};
  for(let attempt=1;attempt<=5;attempt++){
    state=reduce(state,{type:'reset'});
    assert.deepEqual(state,{attempt,token:''});
    state=reduce(state,{type:'token',attempt,token:`token-${attempt}`});
  }
});

test('account submission, confirmation resend and mode changes renew the widget without resetting on typing',()=>{
  const source=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');
  const submit=source.slice(source.indexOf(' const submit='),source.indexOf(' const resendConfirmation='));
  for(const action of ['login','register-v2','recover-v2','reset-request'])assert.ok(submit.includes(`memberRequest('${action}'`));
  assert.match(submit,/finally\{setBusy\(false\);resetCaptcha\(\);\}/);
  const resend=source.slice(source.indexOf(' const resendConfirmation='),source.indexOf(' const downloadRecovery='));
  assert.match(resend,/memberRequest\('resend-confirmation'/);
  assert.match(resend,/finally\{setBusy\(false\);resetCaptcha\(\);\}/);
  assert.match(source,/const switchMode=next=>\{[^\n]+resetCaptcha\(\);\}/);
  assert.match(source,/<TurnstileField key=\{captchaAttempt\} onToken=\{setCaptchaToken\}/);
  const field=source.slice(source.indexOf(' const field='),source.indexOf(' const passwordRules='));
  assert.ok(!field.includes('resetCaptcha'));
});
