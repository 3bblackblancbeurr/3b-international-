import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_HASHES} from '../src/lib/navigation.js';
import {MENU_CATEGORIES,NAV_GROUPS,itemsForCategory,searchNavigation} from '../src/components/navigation-menu.js';
import {MEMBER_SPACES} from '../src/member/memberSources.js';

const app = readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const member = readFileSync(new URL('../src/member/MemberExperiences.jsx',import.meta.url),'utf8');
const health = readFileSync(new URL('../src/health/HealthPage.jsx',import.meta.url),'utf8');
const home = readFileSync(new URL('../src/components/HomePage.jsx',import.meta.url),'utf8');
const newMemberRoutes = {
 news:'news', association:'association', partners:'partners', finance:'finance', travel:'travel',
 join:'join', tv:'tv', admin:'admin', cinema:'cinema',
};

test('all ten new public 3B destinations have direct, unique routes and home cards',()=>{
 const expected = [...Object.keys(newMemberRoutes),'foodscan'];
 assert.equal(new Set(Object.values(PAGE_HASHES)).size,Object.values(PAGE_HASHES).length,'hash routes must be unique');
 for(const id of expected){
  assert.ok(PAGE_HASHES[id],'missing hash for '+id);
  assert.ok(app.includes('id: "'+id+'"'),'missing visible menu description for '+id);
  assert.ok(MENU_CATEGORIES.some(c=>c.ids.includes(id)),'menu category must expose '+id);
  assert.ok(NAV_GROUPS.some(c=>c.ids.includes(id)),'home page group must expose '+id);
 }
 assert.match(home,/secondaryGroups\.map/);
 assert.match(app,/\.\.\.Object\.keys\(MEMBER_SPACE_ROUTES\), "foodscan", "home"/);
});

test('public destinations reuse sourced services and remain visible for logged-out guests',()=>{
 for(const [id,space] of Object.entries(newMemberRoutes)){
  assert.ok(MEMBER_SPACES.some(s=>s.id===space),'missing 3B member experience '+space);
  assert.match(app,new RegExp(id+": '"+space+"'"));
 }
 assert.match(app,/MEMBER_SPACE_ROUTES\[page\] && <MemberExperiences/);
 assert.match(app,/profile=\{loyalty\.profile \|\| null\}/);
 assert.match(member,/initialSpace='loyalty'/);
 assert.match(member,/setActive\(MEMBER_SPACES\.some/);
});

test('the food scanner is a direct Santé 3B route, not the AR world scanner',()=>{
 assert.match(app,/page === "foodscan" && <HealthPage initialTab="scanner"/);
 assert.match(health,/initialTab='today'/);
 assert.match(health,/TABS\.some\(item=>item\.id===initialTab\)/);
 const entries=Array.from(new Set(MENU_CATEGORIES.flatMap(c=>c.ids))).map(id=>({id,label:id,description:id}));
 const food=searchNavigation(entries,'foodscan');
 assert.equal(food.length,1);
 assert.equal(food[0].id,'foodscan');
 assert.equal(itemsForCategory(entries,'services').find(i=>i.id==='foodscan')?.id,'foodscan');
});
