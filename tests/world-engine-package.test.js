import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');

test('world-engine deployment pack includes nested Hub reducer dependencies',()=>{
 const dir=mkdtempSync(join(tmpdir(),'3b-world-engine-')),out=join(dir,'deployment.json');
 try{
  execFileSync(process.execPath,[join(root,'scripts','prepare-world-engine.mjs'),out],{cwd:root,stdio:'pipe'});
  const names=new Set(JSON.parse(readFileSync(out,'utf8')).map((file)=>file.name));
  for(const name of ['global-rewards.js','tournament.js','exploration-checkpoint.js','hub/state.js','hub/mission-catalog.js','hub/mission-runtime.js','hub/activity-catalog.js','hub/secret-runtime.js','hub/mission-signals.js','hub/mission-actions.js','hub/mission-graph.js','hub/dialogue-v3.js','hub/dialogue-intents.js','hub/npc-memory.js','guardian-values.js','guardian-combat.js','resonance-context.js','final-circle.js','cinematic-events.js'])assert.ok(names.has(name),name);
  assert.ok(names.has('engine.js'));
  assert.ok(names.has('rules.js'));
  assert.ok(names.has('index.ts'));
  assert.ok(names.has('deno.json'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('the packaged endpoint boots from its isolated import graph and retains HTTP authentication gates',()=>{
 const dir=mkdtempSync(join(tmpdir(),'3b-world-endpoint-')),out=join(dir,'deployment.json');
 try{
  execFileSync(process.execPath,[join(root,'scripts','prepare-world-engine.mjs'),out],{cwd:root,stdio:'pipe'});
  const files=JSON.parse(readFileSync(out,'utf8'));
  assert.equal(new Set(files.map(file=>file.name)).size,files.length,'package entries must be unique');
  for(const file of files){const output=join(dir,file.name);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,file.content);}
  writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module'}));
  const source=files.find(file=>file.name==='index.ts').content;
  writeFileSync(join(dir,'index.mjs'),stripTypeScriptTypes(source,{mode:'transform',sourceUrl:'index.ts'}));
  const smoke=`
   import assert from 'node:assert/strict';
   globalThis.fetch=()=>{throw Error('Unexpected network request in unauthenticated smoke test');};
   let handler;
   globalThis.Deno={env:{get:()=> 'isolated-test-value'},serve:callback=>{handler=callback;}};
   await import('./index.mjs');
   assert.equal(typeof handler,'function');
   assert.equal((await handler(new Request('https://test.invalid',{method:'OPTIONS'}))).status,204);
   assert.equal((await handler(new Request('https://test.invalid'))).status,405);
   assert.equal((await handler(new Request('https://test.invalid',{method:'POST',headers:{origin:'https://untrusted.invalid'}}))).status,403);
   const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device:'00000000-0000-4000-8000-000000000000',commands:[]})}));
   assert.equal(response.status,401);
  `;
  execFileSync(process.execPath,['--input-type=module','-e',smoke],{cwd:dir,stdio:'pipe'});
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('authoritative world engine mirrors critical client gameplay reducers',()=>{
 const critical=['engine.js','rules.js','adventure-state.js','frontier.js','district-jobs.js','field-world.js','field-combat.js','tournament.js','exploration-checkpoint.js','global-rewards.js','guardian-values.js','guardian-combat.js','resonance-context.js','final-circle.js','hub/activity-catalog.js','hub/state.js','hub/mission-signals.js','hub/mission-actions.js','hub/mission-runtime.js','hub/mission-catalog.js','hub/mission-graph.js','hub/dialogue-intents.js','hub/npc-memory.js'];
 for(const name of critical){
  const client=readFileSync(join(root,'src','world',name),'utf8');
  const server=readFileSync(join(root,'supabase','functions','world-engine-goldmaster-candidate',name),'utf8');
  assert.equal(server,client,name+' diverged between client and authoritative server');
 }
});
