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

test('home exposes a clear next step and compact journey status',()=>{
 const home=read('src/components/HomePage.jsx');
 assert.match(home,/home-journey-status/);
 assert.match(home,/Activer mon Passeport 3B/);
 assert.match(home,/Entrer dans le Monde du 3B/);
 assert.match(home,/Ouvert · 8 héritages/);
 assert.match(home,/Web · installable/);
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
