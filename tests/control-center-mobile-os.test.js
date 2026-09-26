import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Command OS stays mobile-first while remaining responsive for the owner on desktop',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const css=read('src/control/control-center.css');
 const app=read('src/App.jsx');
 assert.match(page,/3B COMMAND OS/);
 assert.match(page,/isPhoneClient/);
 assert.match(page,/OWNER · MOBILE FIRST/);
 assert.match(page,/OWNER · DESKTOP/);
 assert.doesNotMatch(page,/Version téléphone uniquement/);
 assert.match(page,/controlCenterRequest\('status'\)/);
 assert.match(page,/api\.github\.com\/repos\/3bblackblancbeurr\/3b-international-/);
 assert.match(page,/control-dock/);
 assert.match(page,/NAVIGATION_COMMANDS/);
 assert.match(page,/Recherche et Command Palette 3B/);
 assert.match(page,/is-desktop/);
 assert.match(css,/@keyframes controlOrbit/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.control-page\.is-desktop/);
 assert.match(css,/@media \(pointer:coarse\)/);
 assert.match(app,/\['world3b','arena','game','control'\]/);
 assert.match(app,/passportAllowed = new Set\(\["home", "passport", "member", "religion", "control"\]\)/);
});

test('Command OS V2 exposes a truthful Nexus, privacy mode and fact-only brief',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const nexus=read('src/control/CommandNexus.jsx');
 assert.match(page,/import CommandNexus/);
 assert.match(page,/<CommandNexus/);
 assert.match(page,/privacyMode/);
 assert.match(page,/healthy.*known/s);
 assert.doesNotMatch(page,/État global.*pour cent/);
 assert.match(nexus,/COMMAND BRIEF/);
 assert.match(nexus,/Nexus 3B/);
 assert.match(nexus,/Non connecté/);
 assert.match(nexus,/Aucune source financière connectée/);
 assert.match(nexus,/Aucun compte e-mail connecté/);
 assert.match(nexus,/Aucune donnée simulée/);
 assert.match(nexus,/API Vercel non connectée/);
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

test('traffic intelligence is removed from Passport and lives in owner Command OS',()=>{
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
