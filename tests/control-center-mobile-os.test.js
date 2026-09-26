import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Command OS stays mobile-first while remaining responsive for the owner on desktop',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const css=read('src/control/control-center.css');
 const app=read('src/App.jsx');
 assert.match(page,/COMMAND OS/);
 assert.match(page,/control-brand/);
 assert.match(page,/isPhoneClient/);
 assert.match(page,/OWNER · MOBILE FIRST/);
 assert.match(page,/OWNER · DESKTOP/);
 assert.doesNotMatch(page,/Version téléphone uniquement/);
 assert.match(page,/controlCenterRequest\('status'\)/);
 assert.match(page,/api\.github\.com\/repos\/3bblackblancbeurr\/3b-international-/);
 assert.match(page,/control-dock/);
 assert.match(page,/NAVIGATION_COMMANDS/);
 assert.match(page,/Recherche et Command Palette 3B/);
 assert.match(page,/aria-keyshortcuts="Control\+K Meta\+K"/);
 assert.match(page,/commandInputRef/);
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


test('Command OS keeps navigation alive offline and preserves last-known production truth',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 assert.match(page,/safeTimedFetch/);
 assert.match(page,/Réseau indisponible · dernières données valides conservées/);
 assert.match(page,/disabled=\{!!busy\}>GO/);
 assert.doesNotMatch(page,/disabled=\{!primaryOnline\|\|!!busy\}>GO/);
 assert.doesNotMatch(page,/network:false,production:false/);
 assert.match(page,/600000/);
});

test('large owner modules are isolated and use only truthful real-source states',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const boundary=read('src/control/ModuleBoundary.jsx');
 const dev=read('src/control/DevCenterPanel.jsx');
 const health=read('src/control/AppHealthPanel.jsx');
 const security=read('src/control/SecurityCenterPanel.jsx');
 const alerts=read('src/control/AlertCenterPanel.jsx');
 const projects=read('src/control/ProjectsCenterPanel.jsx');
 assert.match(page,/ModuleBoundary/);
 assert.match(boundary,/Les autres fonctions de Command OS continuent de fonctionner/);
 assert.match(dev,/Comptage GitHub réel/);
 assert.match(dev,/API Vercel complète reste distincte/);
 assert.match(health,/navigator\.storage/);
 assert.match(health,/serviceWorker/);
 assert.match(health,/Aucune mesure CPU\/GPU du téléphone n’est inventée/);
 assert.match(security,/allowCount/);
 assert.match(security,/Session propriétaire contrôlée côté serveur/);
 assert.match(alerts,/URGENT/);
 assert.match(alerts,/Tout est calme/);
 assert.match(projects,/Aucun pourcentage d’avancement/);
 assert.match(projects,/Suivi de jalons dédié non connecté/);
});

test('privacy personalization and pending-command controls stay local and explicit',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const settings=read('src/control/CommandSettingsPanel.jsx');
 assert.match(page,/sessionStorage\.setItem\('3b-command-privacy'/);
 assert.match(page,/localStorage\.setItem\('3b-command-compact'/);
 assert.match(page,/localStorage\.setItem\('3b-command-reduced'/);
 assert.match(page,/controlCenterRequest\('cancel'/);
 assert.match(page,/control-cancel-command/);
 assert.match(settings,/Ces préférences restent locales à cet appareil/);
 assert.match(settings,/Réduire mouvements/);
});

test('Radar charts expose exact values on touch instead of relying on hover titles',()=>{
 const traffic=read('src/components/DirectorTraffic.jsx');
 const css=read('src/control/control-center.css');
 assert.match(traffic,/aria-pressed=\{active\}/);
 assert.match(traffic,/Touche une barre pour afficher sa valeur exacte/);
 assert.match(traffic,/onClick=\{\(\)=>setSelected/);
 assert.match(css,/control-traffic-exact/);
 assert.match(css,/button\.control-traffic-bar/);
});
