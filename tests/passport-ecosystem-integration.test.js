import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shop=readFileSync(new URL('../src/shop/ShopPage.jsx',import.meta.url),'utf8');
const sport=readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const community=readFileSync(new URL('../src/community/CommunityPage.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('Boutique attaches loyalty to the shared Passport identity and does not create a second auth client',()=>{
 assert.match(shop,/useLoyalty/);
 assert.match(shop,/account\.passport/);
 assert.match(shop,/checkoutAuth/);
 assert.doesNotMatch(shop,/createClient\(/);
});

test('Sport challenges use the shared account and media cards remain internal',()=>{
 assert.match(sport,/useLoyalty/);
 assert.match(sport,/account\.user/);
 assert.match(sport,/LECTEUR INTERNE 3B/);
 assert.match(sport,/les cartes H24 et Finales ne contiennent aucun lien externe/);
 assert.doesNotMatch(sport,/target=['"]_blank['"]/);
});

test('Community is built on the shared 3B account but stays closed behind the current release gate',()=>{
 assert.match(community,/useLoyalty/);
 assert.match(community,/authClient/);
 assert.doesNotMatch(community,/createClient\(/);
 assert.match(app,/page === "community" && <ComingSoon/);
});

test('Religion remains a same-origin 3B surface',()=>{
 assert.match(app,/ReligionPage/);
 const religion=readFileSync(new URL('../src/components/ReligionPage.jsx',import.meta.url),'utf8');
 assert.match(religion,/\/religion\/index\.html#home/);
 assert.doesNotMatch(religion,/https?:\/\//);
});
