import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('local APEX installer is signature-gated, reversible and does not overwrite the legacy launcher',()=>{
 const source=read('scripts/install-albert-apex-v2.mjs');
 assert.match(source,/ALBERT_MAX_RUNTIME/);
 assert.match(source,/python_venv_missing/);
 assert.match(source,/albert_launcher_signature_missing/);
 assert.match(source,/Installation refusée: signature ALBERT non reconnue/);
 assert.match(source,/backups/);
 assert.match(source,/START_ALBERT_APEX_OS_V2\.bat/);
 assert.match(source,/apex_v2_removed/);
 assert.doesNotMatch(source,/shell\s*:\s*true/);
 assert.doesNotMatch(source,/powershell|cmd\.exe|RunAs|runas/i);
});

test('local APEX package implements sequential evidence-gated orchestration',()=>{
 const core=read('runtime/albert_apex_v2/core.py');
 assert.match(core,/PHASES = \("INTENT", "ASSESS", "PLAN", "EXECUTE", "REVIEW", "VERIFY", "EVIDENCE"\)/);
 assert.match(core,/CONSTITUTION =/);
 assert.match(core,/ACTION_POLICY/);
 assert.match(core,/class SpecCompiler/);
 assert.match(core,/class MetacognitiveSupervisor/);
 assert.match(core,/class ModelRegistry/);
 assert.match(core,/class ResourceGovernor/);
 assert.match(core,/class ApexRuntime/);
 assert.match(core,/Completion refusée: EVIDENCE non atteinte/);
 assert.match(core,/Completion refusée: preuve incomplète/);
 assert.match(core,/shell=False/);
});

test('local APEX API is localhost-only and exposes no arbitrary command execution route',()=>{
 const server=read('runtime/albert_apex_v2/server.py');
 assert.match(server,/HOST = "127\.0\.0\.1"/);
 assert.match(server,/PORT = int\(os\.getenv\("ALBERT_APEX_PORT", "8766"\)\)/);
 assert.match(server,/MAX_BODY = 64 \* 1024/);
 assert.match(server,/\/task\/create/);
 assert.match(server,/\/action\/propose/);
 assert.match(server,/\/core\/stop/);
 assert.match(server,/\/core\/resume/);
 assert.doesNotMatch(server,/subprocess|os\.system|shell=True|eval\(/);
});

test('package exposes ALBERT APEX local install status and rollback commands',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.scripts['albert:apex-install'],'node scripts/install-albert-apex-v2.mjs install');
 assert.equal(pkg.scripts['albert:apex-status'],'node scripts/install-albert-apex-v2.mjs status');
 assert.equal(pkg.scripts['albert:apex-remove'],'node scripts/install-albert-apex-v2.mjs remove');
});
