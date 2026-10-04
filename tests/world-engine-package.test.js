import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');

test('world-engine deployment pack includes nested Hub reducer dependencies',()=>{
 const dir=mkdtempSync(join(tmpdir(),'3b-world-engine-')),out=join(dir,'deployment.json');
 try{
  execFileSync(process.execPath,[join(root,'scripts','prepare-world-engine.mjs'),out],{cwd:root,stdio:'pipe'});
  const files=JSON.parse(readFileSync(out,'utf8')),names=new Set(files.map((file)=>file.name));
  for(const name of ['hub/state.js','hub/mission-catalog.js','hub/mission-runtime.js','hub/activity-catalog.js','hub/secret-runtime.js','hub/mission-signals.js','hub/mission-actions.js','hub/mission-graph.js','hub/dialogue-v3.js','hub/dialogue-intents.js','hub/npc-memory.js','guardian-values.js','guardian-combat.js','resonance-context.js','final-circle.js','cinematic-events.js'])assert.ok(names.has(name),name);
  assert.ok(names.has('engine.js'));
  assert.ok(names.has('rules.js'));
  assert.ok(names.has('global-rewards.js'));
  assert.ok(names.has('combat-sight.js'));
  assert.ok(names.has('collision.js'));
  assert.ok(names.has('index.ts'));
  assert.ok(names.has('deno.json'));
  for(const file of files)for(const match of file.content.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)){
   const dependency=posix.normalize(posix.join(posix.dirname(file.name),match[1]));
   assert.ok(!dependency.startsWith('../')&&!posix.isAbsolute(dependency),file.name+' escapes the deployment root');
   assert.ok(names.has(dependency),file.name+' needs missing runtime dependency '+dependency);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('authoritative world engine mirrors critical client gameplay reducers',()=>{
 const critical=['engine.js','rules.js','adventure-state.js','frontier.js','district-jobs.js','field-world.js','field-combat.js','combat-sight.js','collision.js','guardian-values.js','guardian-combat.js','resonance-context.js','final-circle.js','hub/activity-catalog.js','hub/state.js','hub/mission-signals.js','hub/mission-actions.js','hub/mission-runtime.js','hub/mission-catalog.js','hub/mission-graph.js','hub/dialogue-intents.js','hub/npc-memory.js'];
 for(const name of critical){
  const client=readFileSync(join(root,'src','world',name),'utf8');
  const server=readFileSync(join(root,'supabase','functions','world-engine-goldmaster-candidate',name),'utf8');
  assert.equal(server,client,name+' diverged between client and authoritative server');
 }
});
