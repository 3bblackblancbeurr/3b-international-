import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('the app has one explicit phone tablet desktop responsive contract',()=>{
 const app=read('../src/App.jsx');
 const hook=read('../src/lib/useViewportProfile.js');
 const css=read('../src/styles/responsive-premium.css');
 assert.match(app,/useViewportProfile\(\)/);
 assert.match(app,/responsive-premium\.css/);
 assert.match(hook,/data(?:set)?\.viewport|dataset\.viewport/);
 assert.match(hook,/max-width: 720px/);
 assert.match(hook,/max-width: 1024px/);
 assert.match(css,/data-viewport="phone"/);
 assert.match(css,/data-viewport="tablet"/);
});

test('phone home puts the World 3B copy before its cinematic Nexus stage',()=>{
 const css=read('../src/styles/home-premium.css');
 const goldMaster=css.slice(css.lastIndexOf('Nexus architectural gold master'));
 assert.match(goldMaster,/world-portal-copy\{order:1/);
 assert.match(goldMaster,/world-portal-stage\{order:2/);
 assert.match(goldMaster,/nexus-authentic-circle/);
});

test('Passport keeps one original responsive card and never restores the removed Details/zoom UI',()=>{
 const passport=read('../src/components/PassportVisual.jsx');
 const css=read('../src/styles/responsive-premium.css');
 assert.match(passport,/passport-card-desktop/);
 assert.match(passport,/passport-horizontal-view/);
 assert.match(passport,/PublicIdentityBadge/);
 assert.match(passport,/PassportPortrait/);
 assert.match(passport,/passport-portal-trigger/);
 assert.match(passport,/MA VILLE/);
 assert.doesNotMatch(passport,/passport-phone-card|viewChoice|>Détails<\/button>|>Carte<\/button>|passport-card-zoom|Agrandir|data-zoomed/);
 assert.doesNotMatch(css,/passport-card-desktop\{display:none\}/);
 assert.match(css,/passport-card-viewport\{[^}]*max-width:100%;[^}]*overflow-x:auto/);
});

test('the single Passport card retains blue Matrix motion without a duplicate phone layer',()=>{
 const passport=read('../src/components/PassportVisual.jsx');
 const effects=read('../src/styles/passport-effects.css');
 assert.match(passport,/passport-matrix-rain/);
 assert.doesNotMatch(passport,/passport-phone-rain|passport-phone-matrix/);
 assert.match(passport,/motionAllowed && visible && !portalOpen/);
 assert.match(effects,/animation: passportMatrixFall/);
 assert.match(effects,/@keyframes passportMatrixFall \{ from \{ transform:/);
});

test('shop and games keep large media on phone',()=>{
 const shop=read('../src/shop/ShopPage.jsx');
 const shopCss=read('../src/shop/shop.css');
 const games=read('../src/games/premium.css');
 assert.match(shop,/shop-image-viewer/);
 assert.match(shop,/Voir en grand/);
 assert.match(shopCss,/height:min\(62dvh,540px\)/);
 assert.match(games,/Phone gold master/);
 assert.match(games,/premium-library\{grid-template-columns:1fr/);
});
