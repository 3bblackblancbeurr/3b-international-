import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Command OS is phone-first and keeps the owner-only command surface',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const css=read('src/control/control-center.css');
 const app=read('src/App.jsx');
 assert.match(page,/3B COMMAND OS/);
 assert.match(page,/Version téléphone uniquement/);
 assert.match(page,/isPhoneClient/);
 assert.match(page,/controlCenterRequest\('status'\)/);
 assert.match(page,/api\.github\.com\/repos\/3bblackblancbeurr\/3b-international-/);
 assert.match(page,/control-dock/);
 assert.match(css,/@keyframes controlOrbit/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(app,/\['world3b','arena','game','control'\]/);
 assert.match(app,/passportAllowed = new Set\(\["home", "passport", "member", "religion", "control"\]\)/);
});

test('Control Center status exposes audited live events',()=>{
 const source=read('supabase/functions/control-center/index.ts');
 assert.match(source,/control_center_events\?user_id=eq\./);
 assert.match(source,/server_time:new Date\(\)\.toISOString\(\)/);
 assert.match(source,/events,/);
});

test('PC agent publishes runtime telemetry without arbitrary shell execution',()=>{
 const agent=read('scripts/threeb-control-agent.mjs');
 assert.match(agent,/VERSION='1\.2\.0'/);
 assert.match(agent,/_runtime:systemStatus\(\)/);
 assert.doesNotMatch(agent,/child_process\.exec/);
 assert.doesNotMatch(agent,/shell\s*:\s*true/);
});


test('traffic intelligence is removed from Passport and lives in owner mobile Command OS',()=>{
 const app=read('src/App.jsx');
 const page=read('src/control/ControlCenterPage.jsx');
 const traffic=read('src/components/DirectorTraffic.jsx');
 assert.doesNotMatch(app,/import DirectorTraffic/);
 assert.doesNotMatch(app,/<DirectorTraffic\s*\/>/);
 assert.match(page,/import DirectorTraffic/);
 assert.match(page,/<DirectorTraffic\s*\/>/);
 assert.match(page,/jumpTo\('cc-traffic'\)/);
 assert.match(traffic,/id="cc-traffic"/);
 assert.match(traffic,/app_director_traffic_summary/);
 assert.match(traffic,/app_director_traffic_timeline/);
 assert.match(traffic,/INTELLIGENCE · FRÉQUENTATION/);
 assert.match(traffic,/mise à jour auto · 30 s/);
});
