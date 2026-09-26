import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Command OS V3 adds factual daily brief and explicit integration contracts',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const brief=read('src/control/DailyBriefPanel.jsx');
 const integrations=read('src/control/IntegrationCenterPanel.jsx');
 assert.match(page,/DailyBriefPanel/);
 assert.match(page,/IntegrationCenterPanel/);
 assert.match(brief,/Données chargées|DONNÉES CHARGÉES/);
 assert.match(brief,/events/);
 assert.match(brief,/commands/);
 assert.match(brief,/Une source non connectée n’est jamais estimée/);
 assert.match(integrations,/Aucun compte mail applicatif/);
 assert.match(integrations,/Aucune source bancaire ou financière/);
 assert.match(integrations,/API Vercel complète/);
 assert.match(integrations,/Aucun connecteur futur ne doit placer de secret dans le frontend/);
});

test('Command OS V3 search exposes modules and only loaded audit data',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const search=read('src/control/CommandSearchResults.jsx');
 assert.match(page,/CommandSearchResults/);
 assert.match(search,/RÉSULTATS INSTANTANÉS/);
 assert.match(search,/commands/);
 assert.match(search,/events/);
 assert.match(search,/cc-integrations/);
 assert.match(search,/Aucun module ou événement chargé ne correspond/);
});

test('Command OS V3 personalization can hide non-critical modules without changing server permissions',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const settings=read('src/control/CommandSettingsPanel.jsx');
 assert.match(page,/3b-command-hidden/);
 assert.match(page,/3b-command-haptics/);
 assert.match(page,/isVisible\('brief'\)/);
 assert.match(page,/isVisible\('security'\)/);
 assert.match(settings,/MODULES VISIBLES/);
 assert.match(settings,/Haptique/);
 assert.match(settings,/Réinitialiser/);
 assert.match(settings,/ne changent aucune permission serveur/);
});

test('Command OS V3 keeps explicit offline truth and last valid data wording',()=>{
 const page=read('src/control/ControlCenterPage.jsx');
 const css=read('src/control/control-center.css');
 assert.match(page,/Mode hors ligne/);
 assert.match(page,/Dernières données valides conservées/);
 assert.match(css,/control-offline-banner/);
 assert.doesNotMatch(page,/network:false,production:false/);
});

test('V3 integrations do not embed secrets or pretend disconnected services are live',()=>{
 const source=read('src/control/IntegrationCenterPanel.jsx');
 assert.doesNotMatch(source,/sk-[A-Za-z0-9]/);
 assert.doesNotMatch(source,/Bearer\s+[A-Za-z0-9._-]+/);
 assert.match(source,/state:'disconnected'.*E-mail/s);
 assert.match(source,/state:'disconnected'.*Réseaux sociaux/s);
 assert.match(source,/state:'disconnected'.*Finances/s);
 assert.match(source,/state:'disconnected'.*Agenda/s);
 assert.match(source,/state:'disconnected'.*3B IA Command/s);
});
