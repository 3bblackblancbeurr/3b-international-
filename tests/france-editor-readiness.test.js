import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));

const manifest=json('unreal/ThreeBWorld/Data/France/france-editor-asset-manifest.json');
const plan=json('unreal/ThreeBWorld/Data/France/france-editor-execution-plan-v1.json');

test('France Editor execution plan covers every critical asset exactly once',()=>{
 const required=manifest.required_assets.filter(x=>x.critical).map(x=>x.path).sort();
 const planned=plan.stages.flatMap(s=>s.asset_paths||[]).sort();
 assert.deepEqual(planned,required);
 assert.equal(planned.length,new Set(planned).size);
});

test('France Editor stages are strictly ordered and require real external evidence',()=>{
 const orders=plan.stages.map(x=>x.order);
 assert.deepEqual(orders,[...orders].sort((a,b)=>a-b));
 assert.equal(new Set(orders).size,orders.length);
 assert.equal(plan.evidence_rules.no_step_may_claim_validated_without_editor_proof,true);
 for(const stage of plan.stages){
  assert.equal(stage.editor_required,true,stage.id);
  assert.ok((stage.evidence||[]).length>0,stage.id);
 }
});

test('France Editor plan preserves source contracts and Gold Master honesty',()=>{
 const allContracts=new Set(plan.stages.flatMap(s=>s.source_contracts||[]));
 for(const required of [
  'france-justice-v1.json',
  'france-checkpoint-reconnect-v1.json',
  'france-npc-dialogue-v1.json',
  'france-presentation-v1.json',
  'france-nexus-handoff-v1.json',
  'france-coop-session-v1.json',
  'celiane-state-tree-spec.json'
 ]) assert.ok(allContracts.has(required),required);
 assert.match(plan.completion_rule,/Gold Master only after every stage has real external evidence/i);
});
