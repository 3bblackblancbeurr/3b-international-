import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('local bridge detects the real ALBERT Windows runtime without arbitrary shell access',()=>{
 const agent=read('scripts/threeb-control-agent.mjs');
 assert.match(agent,/VERSION='1\.5\.0'/);
 assert.match(agent,/ALBERT_MAX_RUNTIME/);
 assert.match(agent,/START_ALBERT_APEX_OS_V2\.bat/);
 assert.match(agent,/START_ALBERT_APEX\.bat/);
 assert.match(agent,/albert_desktop_final\.py/);
 assert.match(agent,/memory_v4\.py/);
 assert.match(agent,/streaming_chat\.py/);
 assert.match(agent,/evaluation_200\.py/);
 assert.match(agent,/127\.0\.0\.1:8765/);
 assert.match(agent,/127\.0\.0\.1:8766\/health/);
 assert.match(agent,/ollamaModels/);
 assert.match(agent,/runFixed\('ollama',\['list'\],3500\)/);
 assert.match(agent,/albert_runtime_telemetry:true/);
 assert.match(agent,/albert_apex_core_telemetry:true/);
 assert.match(agent,/apex_core:apexCore/);
 assert.match(agent,/_runtime:\{\.\.\.systemStatus\(\),albert\}/);
 assert.doesNotMatch(agent,/child_process\.exec/);
 assert.doesNotMatch(agent,/shell\s*:\s*true/);
 assert.doesNotMatch(agent,/powershell|cmd\.exe/i);
});

test('APEX cockpit exposes verified local runtime details and direct navigation',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const panel=read('src/control/AlbertApexPanel.jsx');
 const services=read('src/control/albert-apex-services.js');
 assert.match(page,/target:'cc-apex'/);
 assert.match(page,/jumpTo\('cc-apex'\)/);
 assert.match(page,/id="cc-apex"/);
 assert.match(panel,/ALBERT WINDOWS LOCAL/);
 assert.match(panel,/localAlbert\.api_online/);
 assert.match(panel,/localAlbert\.apex_core/);
 assert.match(panel,/Core APEX :8766/);
 assert.match(panel,/localAlbert\.models/);
 assert.match(panel,/localAlbert\.modules/);
 assert.match(services,/albertRuntime===true/);
 assert.match(services,/Runtime Windows ALBERT/);
 assert.match(services,/apexLocalCore/);
 assert.match(services,/Core APEX localhost/);
});
