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

test('Passport phone UI is a dedicated readable card, not a shrunken desktop card',()=>{
 const passport=read('../src/components/PassportVisual.jsx');
 const css=read('../src/styles/responsive-premium.css');
 assert.match(passport,/passport-card-desktop/);
 assert.match(passport,/passport-phone-card/);
 assert.match(passport,/PublicIdentityBadge/);
 assert.match(passport,/PassportPortrait/);
 assert.match(css,/passport-card-desktop\{display:none\}/);
 assert.match(css,/passport-phone-card/);
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
