import test from 'node:test';import assert from 'node:assert/strict';
import {cityAdvisorBulletin} from '../src/city/city3b-advisors.js';
test('advisor follows server missions, readiness and finished campaigns',()=>{
 assert.equal(cityAdvisorBulletin(null),null);
 const campaign={available:true,missions:[{code:'one',chapter:10,title:'Gare',description:'Construisons une gare',status:'available',action:{tab:'build'},objectives:[]}]};
 assert.equal(cityAdvisorBulletin(campaign).advisor.name,'Nora');
 campaign.missions[0].status='ready';assert.equal(cityAdvisorBulletin(campaign).ready,true);
 campaign.missions[0].status='claimed';assert.equal(cityAdvisorBulletin(campaign).advisor.name,'Jade');
 assert.match(cityAdvisorBulletin(campaign).text,/1 missions/);
});
