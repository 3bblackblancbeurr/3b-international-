import test from 'node:test';
import assert from 'node:assert/strict';
import {jevConfigured,moderationRequest,interpretModeration,assistantPlanRequest,interpretAssistantPlan,systemOne} from '../supabase/functions/ecosystem/jev.js';

test('Jev stays off unless explicitly enabled and keyed',()=>{
 assert.equal(jevConfigured({AI_ENABLED:'true',JEV_ENABLED:'true',TYPESAFE_API_KEY:'x'}),true);
 assert.equal(jevConfigured({AI_ENABLED:'true',JEV_ENABLED:'false',TYPESAFE_API_KEY:'x'}),false);
 assert.equal(jevConfigured({AI_ENABLED:'true',JEV_ENABLED:'true'}),false);
});

test('moderation request is fixed server-side and does not accept arbitrary actions',()=>{
 const q=moderationRequest('Bonjour à tous','chat');
 assert.equal(q.model,'jev-latest');
 assert.equal(q.state.content,'Bonjour à tous');
 assert.deepEqual(Object.keys(q.questions['community.action'].criteria),['allow','warn','block','escalate']);
});

test('moderation thresholds reduce low-confidence harsh actions',()=>{
 assert.equal(interpretModeration({answers:{'community.action':{choice:'block',confidence:.9}}}).action,'block');
 assert.equal(interpretModeration({answers:{'community.action':{choice:'block',confidence:.5}}}).action,'allow');
 assert.equal(interpretModeration({answers:{'community.action':{choice:'allow',confidence:.9},'community.obfuscation':{noul:.95}}}).action,'warn');
 assert.equal(interpretModeration({answers:{'community.action':{choice:'other',confidence:.9}}}),null);
});

test('assistant planning only returns bounded labels',()=>{
 const q=assistantPlanRequest([{role:'user',content:'Corrige ce bug React'}]);
 assert.ok(q.state.includes('Corrige ce bug React'));
 assert.deepEqual(interpretAssistantPlan({answers:{'assistant.domain':{choice:'technical',confidence:.8},'assistant.depth':{choice:'deep',confidence:.7}}}),{domain:'technical',depth:'deep',confidence:{domain:.8,depth:.7}});
});

test('systemOne keeps the API key in Authorization and validates output',async()=>{
 let seen;
 const fetcher=async(url,init)=>{seen={url,init};return new Response(JSON.stringify({model:'jev-latest',answers:{x:{type:'choice',choice:'a',confidence:.9}}}),{status:200,headers:{'Content-Type':'application/json'}})};
 const out=await systemOne({apiKey:'secret',state:'x',questions:{x:{type:'choice',criteria:{a:'A'}}},fetcher});
 assert.equal(seen.url,'https://api.typesafe.ai/v1/systemone');
 assert.equal(seen.init.headers.Authorization,'Bearer secret');
 assert.equal(out.answers.x.choice,'a');
});
