import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function runPython(script,env={}){
 let last='';
 for(const executable of (process.platform==='win32'?['python','python3']:['python3','python'])){
  const result=spawnSync(executable,['-c',script],{
   cwd:process.cwd(),
   encoding:'utf8',
   shell:false,
   env:{...process.env,...env,PYTHONIOENCODING:'utf-8'}
  });
  if(result.error?.code==='ENOENT'){last=String(result.error);continue;}
  assert.equal(result.status,0,result.stderr||result.stdout);
  return JSON.parse(result.stdout);
 }
 assert.fail('Python interpreter unavailable: '+last);
}

test('local APEX persists intent continuity, tool trace and doctor state',()=>{
 const root=mkdtempSync(join(tmpdir(),'albert-apex-v3-'));
 try{
  const script=`
import json, os, sys
sys.path.insert(0, 'runtime')
from albert_apex_v2.core import ApexRuntime
rt=ApexRuntime(os.environ['ALBERT_TEST_ROOT'])
first=rt.begin_task('Corrige le Passeport 3B')
rt.record_tool_result(first['id'],'local.test','premier outil OK',True)
second=rt.begin_task('Vérifie les e-mails importants')
tasks=rt.store.tasks()
session=rt.store.session_state()
doctor=rt.doctor()
reset=rt.reset_session()
print(json.dumps({
 'first_status': next(row['status'] for row in tasks if row['id']==first['id']),
 'second_status': next(row['status'] for row in tasks if row['id']==second['id']),
 'current_task': session['currentTaskId'],
 'current_intent': session['currentIntent'],
 'previous_intent': session['previousIntent'],
 'intent_confidence': session['intentConfidence'],
 'last_tool': session['lastTool'],
 'doctor_state': doctor['state'],
 'doctor_ids': [row['id'] for row in doctor['checks']],
 'reset_state': reset['taskState'],
 'reset_intent': reset['currentIntent']
}, ensure_ascii=False))
`;
  const value=runPython(script,{ALBERT_TEST_ROOT:root});
  assert.equal(value.first_status,'cancelled');
  assert.equal(value.second_status,'running');
  assert.ok(value.current_task);
  assert.equal(value.current_intent,'Vérifie les e-mails importants');
  assert.equal(value.previous_intent,'Corrige le Passeport 3B');
  assert.ok(value.intent_confidence>=0.5);
  assert.equal(value.last_tool,'local.test');
  assert.ok(['nominal','attention'].includes(value.doctor_state));
  assert.ok(value.doctor_ids.includes('runtime_root'));
  assert.ok(value.doctor_ids.includes('continuity'));
  assert.equal(value.reset_state,'idle');
  assert.equal(value.reset_intent,'');
 }finally{
  rmSync(root,{recursive:true,force:true});
 }
});
