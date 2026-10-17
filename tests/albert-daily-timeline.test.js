import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ALBERT_PLAN_KEY,ALBERT_PLAN_MAX_ITEMS,ALBERT_PLAN_ROUTES,ALBERT_PLAN_SUGGESTIONS,
 albertLocalDayKey,normalizeAlbertPlanEntry,normalizeAlbertPlan,
 readAlbertPlan,persistAlbertPlan,createAlbertPlanEntry
} from '../src/components/albert-local-plan.js';
import {PAGE_HASHES} from '../src/lib/navigation.js';

function store(){
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),get data(){return data;}};
}

test('Albert private planner accepts only bounded inputs and existing app routes',()=>{
 assert.equal(ALBERT_PLAN_MAX_ITEMS,12);
 assert.equal(ALBERT_PLAN_ROUTES.length,12);
 for(const route of ALBERT_PLAN_ROUTES)assert.ok(Object.hasOwn(PAGE_HASHES,route.id),route.id);
 for(const suggest of ALBERT_PLAN_SUGGESTIONS)assert.ok(ALBERT_PLAN_ROUTES.some(r=>r.id===suggest.id));
 assert.equal(createAlbertPlanEntry({title:'   ',route:'health'},'a'),null);
 const clean=createAlbertPlanEntry({title:'A'.repeat(90),route:'health',time:'14:35'},'a');
 assert.equal(clean.title.length,72);
 assert.deepEqual(clean,{id:'a',title:clean.title,route:'health',time:'14:35',done:false});
 assert.equal(normalizeAlbertPlanEntry({id:'a',title:'ok',route:'delete-all',time:'99:00',done:'true'}).route,null);
 assert.equal(normalizeAlbertPlanEntry({id:'a',title:'ok',route:'health',time:'24:00',done:true}).time,'');
 assert.equal(normalizeAlbertPlanEntry({id:'a',title:'ok',route:'health',time:'23:59',done:true}).done,true);
 assert.equal(normalizeAlbertPlanEntry({title:'no-id'}),null);
 assert.equal(normalizeAlbertPlanEntry('unsafe'),null);
});

test('Albert timeline lives on the phone, resets on date change and does not persist extra entries',()=>{
 const local=store(),date='2026-10-17',tomorrow='2026-10-18';
 assert.deepEqual(readAlbertPlan(local,date),[]);
 const rows=Array.from({length:20},(_,i)=>({id:'id-'+i,title:'Projet '+i,route:i%2?'health':'games',time:'13:45',done:i===0}));
 assert.equal(persistAlbertPlan(local,rows,date),true);
 assert.equal(readAlbertPlan(local,date).length,ALBERT_PLAN_MAX_ITEMS);
 assert.equal(readAlbertPlan(local,date)[0].done,true);
 assert.deepEqual(readAlbertPlan(local,tomorrow),[]);
 assert.equal(local.data.size,1);
 assert.ok(local.data.has(ALBERT_PLAN_KEY));
 assert.equal(local.data.get(ALBERT_PLAN_KEY).includes('Projet 19'),false);
 assert.deepEqual(normalizeAlbertPlan([{id:'same',title:'First'},{id:'same',title:'Second'}]).map(x=>x.title),['First']);
 assert.equal(readAlbertPlan({getItem(){throw Error('blocked');}},date).length,0);
 assert.equal(persistAlbertPlan({setItem(){throw Error('blocked');}},rows,date),false);
 assert.equal(readAlbertPlan({getItem(){return '{corrupted'}},date).length,0);
 assert.equal(readAlbertPlan({getItem(){return ' '.repeat(12002)}},date).length,0);
});

test('day stamp respects local calendar and rejects invalid dates',()=>{
 assert.equal(albertLocalDayKey(new Date(2026,9,17,12,31)), '2026-10-17');
 assert.equal(albertLocalDayKey('not-a-date'),'');
});

test('UI contains genuine interactive save, complete, delete and optional time/route',()=>{
 const component=readFileSync(new URL('../src/components/AlbertDailyTimeline.jsx',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/components/AlbertPublicPreview.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles/albert-daily-timeline.css',import.meta.url),'utf8');
 const prompts=['readAlbertPlan','persistAlbertPlan','onClick={()=>complete(entry.id)}','onClick={()=>remove(entry.id)}','type="time"','<select','aria-pressed={entry.done}','ALBERT_PLAN_MAX_ITEMS'];
 for(const word of prompts)assert.ok(component.includes(word),word);
 assert.match(ui,/<AlbertDailyTimeline goTo=\{goTo\}/);
 assert.doesNotMatch(ui,/JOURNEY\.map/);
 assert.match(component,/N.y note pas de données sensibles/);
 assert.match(css,/@media\(max-width:370px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(component,/fetch\(/);
});
