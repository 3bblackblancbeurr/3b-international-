import test from 'node:test';import assert from 'node:assert/strict';
import {cityNews,nextMayorMilestone} from '../src/city/city3b-news.js';
import {createCityRenderBudget} from '../src/city/city3b-render-budget.js';
test('journal reports real shortages and rewards without fabricating emergencies',()=>{
 assert.equal(cityNews({city:{city_level:42}})[0].id,'mayor');
 const news=cityNews({life:{needs:[{code:'water',label:'Eau',score:25,demand:100,capacity:25},{code:'empty',score:0,demand:0}],workingPopulation:20,employed:12,placedBuildings:9,connectedBuildings:7,events:[{code:'heat',title:'Chaleur',status:'ready'}]},campaign:{missions:[{status:'ready'}]}});
 assert.deepEqual(news.map(n=>n.id),['event:heat','need:water','jobs','routes','rewards']);assert.match(news[2].text,/8 actifs/);assert.match(news[3].text,/2 bâtiments/);
 assert.equal(nextMayorMilestone(90).level,100);assert.equal(nextMayorMilestone(100).level,100);
});
test('render budget needs sustained slowness and ignores render caps, hidden tabs and suspension',()=>{
 const budget=createCityRenderBudget({mobile:true,pixelRatio:3});let time=0;
 for(let i=0;i<500;i++){time+=16.7;assert.equal(budget.sample(time),null);}assert.equal(budget.state().tier,0);
 for(let i=0;i<120;i++){time+=45;budget.sample(time);}assert.equal(budget.state().tier,0);
 budget.sample(time+10000,false);time+=10000;
 for(let i=0;i<120;i++){time+=45;budget.sample(time);}assert.equal(budget.state().tier,0);
 for(let i=0;i<130;i++){time+=45;budget.sample(time);}assert.equal(budget.state().tier,1);
 for(let i=0;i<250;i++){time+=45;budget.sample(time);}assert.equal(budget.state().tier,2);assert.equal(budget.state().shadows,false);assert.equal(budget.state().pixelRatio,.85);
});
