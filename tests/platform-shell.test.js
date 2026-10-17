// Platform Premium RC — shell global 3B
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('premium platform shell has crash recovery and branded loading states',()=>{
 const main=read('src/main.jsx');
 const boundary=read('src/components/AppErrorBoundary.jsx');
 const loading=read('src/components/AppLoadingState.jsx');
 assert.match(main,/AppErrorBoundary/);
 assert.match(main,/js-app-ready/);
 assert.match(boundary,/Recharger 3B/);
 assert.match(boundary,/Ta progression enregistrée n’est pas supprimée/);
 assert.match(loading,/BLACK · BLANC · BEUR/);
 assert.match(loading,/role="status"/);
});

test('interactive app hides the static SEO fallback without removing no-JS discovery content',()=>{
 const html=read('index.html');
 assert.match(html,/js-app-ready \.seo-discovery\{display:none\}/);
 assert.match(html,/class="seo-discovery"/);
 assert.match(html,/3B International — Black • Blanc • Beur/);
});

test('home opens on one full-screen immersive scene, with services still in navigation',()=>{
 const home=read('src/components/HomePage.jsx');
 const scene=read('src/components/Concept13AtlasHome.jsx');
 const menu=read('src/components/AppNavigation.jsx');
 assert.match(home,/Concept13AtlasHome/);
 assert.doesNotMatch(home,/WorldPortalCard|secondaryGroups\.map|home-journey-status/);
 assert.match(scene,/atlas3b/);
 assert.match(scene,/threeb:open-app-menu/);
 assert.match(scene,/RouteLink goTo=\{goTo\} page="world3b"/);
 assert.match(menu,/universe-menu/);
 assert.match(read('src/components/navigation-menu.js'),/Comprendre 3B/);
});

test('historical entry waits for the unique COMMENCER action',()=>{
 const app=read('src/App.jsx');
 const experience=read('src/design-system/LuxuryExperience.jsx');
 assert.match(app,/intro3b-background/);
 assert.match(app,/intro3b-matrix active/);
 assert.match(experience,/>COMMENCER<\/Button>/);
 assert.doesNotMatch(experience,/Passer l.introduction|setTimeout\(finish|readIntroSeen/);
 assert.equal((experience.match(/>COMMENCER<\/Button>/g)||[]).length,1);
});

test('navigation reports connectivity and supports slash search shortcut',()=>{
 const nav=read('src/components/AppNavigation.jsx');
 assert.match(nav,/navigator\.onLine/);
 assert.match(nav,/addEventListener\('offline'/);
 assert.match(nav,/event\.key !== '\/'/);
 assert.match(nav,/aria-keyshortcuts="\/"/);
 assert.match(nav,/searchInput\.current\?\.focus/);
});

test('premium shell includes mobile performance and reduced-motion safeguards',()=>{
 const css=read('src/styles/platform-premium.css');
 assert.match(css,/max-width:720px/);
 assert.match(css,/animation:none!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/home-journey-status/);
 assert.match(css,/app-crash/);
});


test('installed app exposes shortcuts to the three core 3B journeys',()=>{
 const manifest=JSON.parse(read('public/manifest.webmanifest'));
 assert.deepEqual(manifest.shortcuts.map(item=>item.url),['/#passeport','/#monde-3b','/#boutique']);
 assert.ok(manifest.categories.includes('lifestyle'));
});


test('Manga and Secret placeholders read as intentional premium previews',()=>{
 const coming=read('src/components/ComingSoon.jsx');
 assert.match(coming,/Le Cercle Brisé/);
 assert.match(coming,/8 Portes · 8 valeurs/);
 assert.match(coming,/PROTOCOLE VERROUILLÉ/);
 assert.match(coming,/Entrer dans le Monde du 3B/);
});
