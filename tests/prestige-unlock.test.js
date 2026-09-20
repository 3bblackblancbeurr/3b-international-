import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('member-api Prestige unlock is authenticated, rate-limited and server-derived',()=>{
  const source=read('supabase/functions/member-api/index.ts');
  assert.match(source,/const uid=await authenticate\(req\)/);
  assert.match(source,/uid\+':prestige'/);
  assert.match(source,/prestige_eligible!==true/);
  assert.match(source,/next_prestige_level/);
  assert.match(source,/threeb_unlock_prestige_server/);
  assert.match(source,/p_event_id:'prestige:'\+next\+':v1'/);
  assert.doesNotMatch(source,/p_prestige_level|body\.prestige_level|body\.next_prestige/);
});

test('member-api supports native Capacitor origins',()=>{
  const source=read('supabase/functions/member-api/index.ts');
  assert.match(source,/https:\/\/localhost/);
  assert.match(source,/capacitor:\/\/localhost/);
});

test('member UI only offers Prestige when server snapshot says eligible',()=>{
  const source=read('src/loyalty/AccountPage.jsx');
  assert.match(source,/economy\?\.prestige_eligible/);
  assert.match(source,/memberRequest\('prestige'/);
  assert.match(source,/Débloquer Prestige/);
  assert.doesNotMatch(source,/risk_score|review_required|sensitive_rewards_held/);
});
