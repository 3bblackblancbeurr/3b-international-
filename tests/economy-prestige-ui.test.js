import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');

test('member UI displays authoritative title prestige and season without risk internals',()=>{
 assert.match(source,/economy\?\.title/);
 assert.match(source,/prestige_level/);
 assert.match(source,/Saison active/);
 assert.doesNotMatch(source,/risk_score|review_required|sensitive_rewards_held/);
});
