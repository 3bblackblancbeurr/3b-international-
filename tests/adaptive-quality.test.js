import test from 'node:test';
import assert from 'node:assert/strict';
import {createQualityController} from '../src/world/motion.js';

test('automatic quality starts detailed and recovers slowly after sustained overload',()=>{
 const q=createQualityController();
 assert.equal(q.profile(),'high');
 const initial=q.ratio(390,844,3);
 for(let i=0;i<8;i++)q.sample(28,1);
 assert.equal(q.profile(),'light');
 assert.ok(q.ratio(390,844,3)<initial);
 for(let i=0;i<11;i++)assert.equal(q.sample(60,1),false);
 assert.equal(q.profile(),'light');
 for(let i=0;i<100;i++)q.sample(60,1);
 assert.equal(q.profile(),'high');
 assert.equal(q.ratio(390,844,3),initial);
});

test('invalid samples and short fluctuations do not reduce quality; manual modes remain stable',()=>{
 const q=createQualityController();
 const start=q.ratio(1280,720,2);
 for(const fps of [NaN,Infinity,0,-10])assert.equal(q.sample(fps,1),false);
 for(let i=0;i<30;i++){q.sample(35,1);q.sample(55,1);}
 assert.equal(q.ratio(1280,720,2),start);
 q.setMode('fluid');assert.equal(q.profile(),'light');
 const low=q.ratio(1280,720,2);
 for(let i=0;i<100;i++)q.sample(60,1);
 assert.equal(q.ratio(1280,720,2),low);
 q.setMode('detail');
 for(let i=0;i<100;i++)q.sample(20,1);
 assert.equal(q.profile(),'high');
 assert.equal(q.ratio(1280,720,2),start);
});
