import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Windows autostart is user-level, hidden and requires an existing pairing',()=>{
 const source=read('scripts/threeb-control-autostart.mjs');
 assert.match(source,/Start Menu','Programs','Startup/);
 assert.match(source,/WScript\.Shell/);
 assert.match(source,/shell\.Run command, 0, False/);
 assert.match(source,/Le PC doit être appairé/);
 assert.match(source,/windowsHide:true/);
 assert.doesNotMatch(source,/schtasks/i);
 assert.doesNotMatch(source,/RunAs|Administrator|runas/i);
});

test('agent 1.5 self-heals network failures and prevents duplicate modern agents',()=>{
 const source=read('scripts/threeb-control-agent.mjs');
 assert.match(source,/VERSION='1\.5\.0'/);
 assert.match(source,/agent\.lock/);
 assert.match(source,/pidAlive/);
 assert.match(source,/delay=Math\.min\(Math\.round\(delay\*1\.6\),30000\)/);
 assert.match(source,/autostart:autostartEnabled\(\)/);
 assert.match(source,/agent\.log/);
 assert.doesNotMatch(source,/child_process\.exec/);
 assert.doesNotMatch(source,/shell\s*:\s*true/);
});

test('package exposes install status and removal commands for autostart',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.scripts['control:auto-start'],'node scripts/threeb-control-autostart.mjs install');
 assert.equal(pkg.scripts['control:auto-status'],'node scripts/threeb-control-autostart.mjs status');
 assert.equal(pkg.scripts['control:auto-remove'],'node scripts/threeb-control-autostart.mjs remove');
});

test('mobile Command OS surfaces whether the paired PC starts automatically',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 assert.match(page,/capabilities\?\.autostart/);
 assert.match(page,/3B Control Agent à activer sur le PC/);
 assert.match(page,/démarrage auto/);
});


test('agent 1.5 inventories mounted Windows volumes and NVIDIA hardware without arbitrary shell input',()=>{
 const source=read('scripts/threeb-control-agent.mjs');
 assert.match(source,/statfsSync/);
 assert.match(source,/String\.fromCharCode/);
 assert.match(source,/nvidia-smi/);
 assert.match(source,/storage_inventory:true/);
 assert.match(source,/gpu_telemetry:true/);
 assert.match(source,/albert_runtime_telemetry:true/);
 assert.match(source,/ALBERT_MAX_RUNTIME/);
 assert.match(source,/127\.0\.0\.1:8765/);
 assert.match(source,/ollama/);
 assert.match(source,/spawnSync/);
 assert.match(source,/hardwareCache/);
 assert.doesNotMatch(source,/shell\s*:\s*true/);
});
