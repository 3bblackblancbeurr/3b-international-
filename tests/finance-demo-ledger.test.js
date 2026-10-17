import test from 'node:test';
import assert from 'node:assert/strict';
import {appendDemoOperation,decodeDemoLedger,demoSnapshot,exportDemoCsv,FINANCE_STORAGE_KEY,newDemoLedger,parseDemoAmount,quoteDemoExchange,readDemoLedger} from '../src/finance/demo-ledger.js';

const at='2026-10-17T12:00:00.000Z';
const transfer=(amountMinor,extra={})=>({kind:'transfer',asset:'EUR',amountMinor,recipient:'hub-paris',note:'Premier essai',...extra});
const append=(ledger,operation,id='operation-0001')=>appendDemoOperation(ledger,operation,{id,at});

test('decimal input remains exact and rejects partial, negative, excessive and ambiguous amounts',()=>{
  for(const [text,expected] of [['0,01',1],['12.50',1250],[' 2500,00 ',250000],['1',100],['0001.1',110]])assert.equal(parseDemoAmount(text),expected,text);
  for(const text of ['',null,undefined,'0','-1','+1','1e2','1.001','1,2,3','NaN','Infinity','2 500','12 euros','1000000.01'])assert.equal(parseDemoAmount(text),null,String(text));
});

test('transfers debit only the selected virtual asset and survive a storage round trip',()=>{
  const initial=newDemoLedger();
  const ledger=append(initial,transfer(12550));
  assert.deepEqual(demoSnapshot(ledger).balances,{EUR:237450,T3B:100000});
  assert.deepEqual(initial.events,[],'input ledger remains unchanged');
  assert.deepEqual(demoSnapshot(decodeDemoLedger(JSON.stringify(ledger))),demoSnapshot(ledger));
  const tokenLedger=append(ledger,transfer(550,{asset:'T3B'}),'operation-0002');
  assert.deepEqual(demoSnapshot(tokenLedger).balances,{EUR:237450,T3B:99450});
});

test('overdrafts, invalid recipients, unknown assets and fractional minor units cannot enter the journal',()=>{
  for(const operation of [transfer(250001),transfer(0),transfer(-1),transfer(1.1),transfer(Number.MAX_SAFE_INTEGER),transfer(1,{recipient:'FR761234567890'}),transfer(1,{recipient:'0xabc'}),transfer(1,{asset:'BTC'}),transfer(1,{asset:'__proto__'}),transfer(1,{note:'a'.repeat(81)}),transfer(1,{note:'test\nsecond line'})])assert.throws(()=>append(newDemoLedger(),operation));
  assert.throws(()=>append(newDemoLedger(),{kind:'withdraw',asset:'EUR',amountMinor:1,note:''}));
});

test('exchanges conserve scenario value and use integer arithmetic in both directions',()=>{
  const bought=append(newDemoLedger(),{kind:'exchange',asset:'EUR',amountMinor:12345,note:''});
  assert.deepEqual(demoSnapshot(bought).balances,{EUR:237655,T3B:223450});
  const sold=append(bought,{kind:'exchange',asset:'T3B',amountMinor:123450,note:''},'operation-0002');
  assert.deepEqual(demoSnapshot(sold).balances,demoSnapshot(newDemoLedger()).balances);
  assert.deepEqual(quoteDemoExchange('EUR',1),{asset:'T3B',amountMinor:10});
  assert.throws(()=>quoteDemoExchange('T3B',11),/multiple/);
  assert.throws(()=>append(bought,{kind:'exchange',asset:'T3B',amountMinor:223460,note:''},'operation-0003'),/insuffisant/);
});

test('replaying duplicate references fails and a stale confirmation is revalidated against the latest balance',()=>{
  const first=append(newDemoLedger(),transfer(200000));
  assert.throws(()=>append(first,transfer(200000),'operation-0002'),/insuffisant/);
  assert.throws(()=>append(first,transfer(1)),/déjà enregistrée/);
  assert.throws(()=>decodeDemoLedger(JSON.stringify({...first,events:[...first.events,...first.events]})),/dupliquée/);
});

test('recharges are fixed demo credits and cannot overflow the virtual balance limit',()=>{
  const operation={kind:'topup',asset:'EUR',amountMinor:100000,note:''};
  const ledger=append(newDemoLedger(),operation);
  assert.deepEqual(demoSnapshot(ledger).balances,{EUR:350000,T3B:100000});
  assert.throws(()=>append(newDemoLedger(),{...operation,amountMinor:1}));
  assert.throws(()=>append(newDemoLedger(),{...operation,asset:'T3B'}));
  assert.throws(()=>append(newDemoLedger(),{...operation,recipient:'hub-paris'}));
  let full=newDemoLedger();
  // Replenish then convert until the token balance limit, with a valid journal.
  for(let index=0;index<99;index++){
    full=append(full,operation,'topup-'+String(index).padStart(8,'0'));
    full=append(full,{kind:'exchange',asset:'EUR',amountMinor:100000,note:''},'convert-'+String(index).padStart(8,'0'));
  }
  assert.throws(()=>append(full,{kind:'exchange',asset:'EUR',amountMinor:100000,note:''},'overflow-0001'),/Plafond/);
});

test('malformed or tampered local journals never create an authoritative balance',()=>{
  const ledger=append(newDemoLedger(),transfer(100));
  assert.deepEqual(demoSnapshot({...ledger,balances:{EUR:999999999}}).balances,{EUR:249900,T3B:100000},'supplied balance fields are ignored');
  for(const raw of ['{','null','[]','{}',JSON.stringify({...ledger,mode:'live'}),JSON.stringify({...ledger,version:2}),JSON.stringify({...ledger,events:[{...ledger.events[0],amountMinor:250001}]}),JSON.stringify({...ledger,events:[{...ledger.events[0],at:'yesterday'}]})])assert.throws(()=>decodeDemoLedger(raw));
  assert.throws(()=>decodeDemoLedger('x'.repeat(200001)));
});

test('unavailable or corrupt storage falls back explicitly to a memory-only demonstration',()=>{
  const unavailable=readDemoLedger({getItem(){throw new Error('blocked');}});
  assert.ok(unavailable.warning);
  assert.deepEqual(unavailable.ledger,newDemoLedger());
  const corrupted=readDemoLedger({getItem(){return '{';}});
  assert.ok(corrupted.warning);
  const first=readDemoLedger({getItem(key){assert.equal(key,FINANCE_STORAGE_KEY);return null;}});
  assert.equal(first.warning,'');
  assert.deepEqual(first.ledger,newDemoLedger());
});

test('history capacity is bounded without deleting previous operations',()=>{
  let ledger=newDemoLedger();
  for(let index=0;index<500;index++)ledger=append(ledger,transfer(1),'operation-'+String(index).padStart(8,'0'));
  assert.equal(demoSnapshot(ledger).count,500);
  assert.throws(()=>append(ledger,transfer(1),'operation-extra'),/500/);
  assert.equal(ledger.events.length,500);
});

test('CSV exports label every row as simulation and neutralize spreadsheet formulas in user labels',()=>{
  let ledger=newDemoLedger();
  for(const [index,note] of ['=HYPERLINK("https://example.test")','+SUM(1;2)','@SUM(1;2)','-1+1','Texte "simple"'].entries())ledger=append(ledger,transfer(1,{note}),'operation-'+String(index).padStart(8,'0'));
  const csv=exportDemoCsv(ledger);
  assert.equal(csv.match(/"SIMULATION"/g).length,5);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.test"")"'));
  assert.ok(csv.includes('"\'+SUM(1;2)"'));
  assert.ok(csv.includes('"\'@SUM(1;2)"'));
  assert.ok(csv.includes('"\'-1+1"'));
  assert.ok(csv.includes('"Texte ""simple"""'));
  assert.ok(csv.startsWith('\uFEFF'));
});
