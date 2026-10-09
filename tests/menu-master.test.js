import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NAV_GROUPS,PRINCIPAL_DESTINATIONS,MENU_CATEGORIES,navigationItems,itemsForCategory,searchNavigation,categoryForPage,availableCategories} from '../src/components/navigation-menu.js';

const fixtures=[
 {id:'passport',label:'Passeport',description:'Identité unique'},
 {id:'member',label:'Connexion / Inscription',description:'Retrouver son compte'},
 {id:'world3b',label:'Monde 3B',description:'Explorer les huit royaumes'},
 {id:'invisible',label:'Le Monde Invisible',description:'Énigmes et fragments'},
 {id:'secret',label:'Premier Secret',description:'Le signal du jour'},
 {id:'shop',label:'Boutique',description:'Collections'},
 {id:'loyalty',label:'Cartes de fidélité',description:'Récompenses'},
 {id:'guide',label:'Guide 3B',description:'Comprendre 3B'},
 {id:'games',label:'Jeux 3B',description:'Les jeux',status:'soon'},
 {id:'religion',label:'Religion',description:'Cultures',status:'soon'},
 {id:'ia',label:'Textile & IA',description:'Création'},
];

test('the principal menu has four clear destinations and every supplied route remains discoverable',()=>{
 assert.deepEqual(PRINCIPAL_DESTINATIONS.map(item=>item.label),['Accueil','Passeport','Monde 3B','Boutique']);
 assert.deepEqual(itemsForCategory(fixtures,'principal').map(item=>item.id),['home','passport','world3b','shop']);
 const reachable=new Set(MENU_CATEGORIES.flatMap(category=>itemsForCategory(fixtures,category.id).map(item=>item.id)));
 for(const item of fixtures)assert.ok(reachable.has(item.id),item.id+' remains available');
 assert.ok(itemsForCategory(fixtures,'world').some(item=>item.id==='invisible'));
 assert.equal(itemsForCategory(fixtures,'world').find(item=>item.id==='games').status,'soon','A preview keeps its availability status');
 assert.ok(NAV_GROUPS.find(group=>group.title==='Univers 3B').ids.includes('invisible'));
});

test('categories and global accent-insensitive search never manufacture private account destinations',()=>{
 assert.equal(itemsForCategory(fixtures,'account').some(item=>item.id==='control'),false);
 assert.equal(searchNavigation(fixtures,'command').length,0);
 const authorized=[...fixtures,{id:'control',label:'3B Command OS',description:'Centre privé'}];
 assert.equal(itemsForCategory(authorized,'account').filter(item=>item.id==='control').length,1);
 assert.deepEqual(searchNavigation(fixtures,'ENIGMES').map(item=>item.id),['invisible']);
 assert.deepEqual(searchNavigation(fixtures,'monde invisible').map(item=>item.id),['invisible']);
 assert.equal(searchNavigation(fixtures,'aucune rubrique possible').length,0);
 assert.equal(searchNavigation(fixtures,'  ').length,navigationItems(fixtures).length);
});

test('current pages choose their category and new supplied destinations have a fallback',()=>{
 assert.equal(categoryForPage('invisible',fixtures),'world');assert.equal(categoryForPage('member',fixtures),'account');assert.equal(categoryForPage('ia-textile',fixtures),'discover');
 const future=[...fixtures,{id:'future-space',label:'Nouvel espace',description:'Accessible'}];
 assert.equal(itemsForCategory(future,'discover').filter(item=>item.id==='future-space').length,1);
 assert.equal(categoryForPage('future-space',future),'discover');
 assert.deepEqual(availableCategories([]).map(item=>item.id),['principal','settings']);
 assert.equal(navigationItems([...fixtures,fixtures[0]]).filter(item=>item.id==='passport').length,1);
});

test('the bounded native menu retains keyboard, normal links, current-page semantics and settings',async()=>{
 const navigation=await readFile(new URL('../src/components/AppNavigation.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/styles/simple-navigation.css',import.meta.url),'utf8');
 assert.match(navigation,/className="app-menu-dialog"/);assert.match(navigation,/role="tablist"/);assert.match(navigation,/aria-selected=/);assert.match(navigation,/aria-current=/);
 assert.match(navigation,/ArrowRight/);assert.match(navigation,/ArrowLeft/);assert.match(navigation,/event.key === "Escape"/);assert.match(navigation,/event.key !== '\/'/);
 assert.match(navigation,/event.ctrlKey \|\| event.metaKey/);assert.match(navigation,/getPageHref\(page\)/);assert.match(navigation,/showModal\(\)/);assert.match(navigation,/onCancel=/);
 assert.match(navigation,/data-menu-id=\{item.id\}/);assert.match(navigation,/ExperienceControls/);assert.match(navigation,/CompanionPresenceControl/);assert.match(navigation,/InstallApp/);
 assert.doesNotMatch(navigation,/BrokenCircle3D|menu-mobile-grid|CompactCard|menu-master/);
 assert.match(css,/grid-template-rows:auto auto auto minmax\(0,1fr\) auto/);assert.match(css,/overscroll-behavior:contain/);assert.match(css,/--app-viewport-height/);
 assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i);
});
