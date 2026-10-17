import test from 'node:test';
import assert from 'node:assert/strict';
import { availableCategories, itemsForCategory, searchNavigation, partitionDestinations } from '../src/components/navigation-menu.js';
const items=[{id:'passport',label:'Passeport'},{id:'invisible',label:'Monde caché'},{id:'games',label:'Jeux',status:'soon'},{id:'shop',label:'Boutique'},{id:'control',label:'Commande'},{id:'guide',label:'Guide'}];
test('live destinations stay separate from unfinished spaces without losing links',()=>{
 const world=itemsForCategory(items,'world');const {available,upcoming}=partitionDestinations(world);
 assert.deepEqual(available.map(i=>i.id),['invisible']);assert.deepEqual(upcoming,[]);
 assert.deepEqual(searchNavigation(items,'jeux'),[]);assert.equal(searchNavigation(items,'cache')[0].id,'invisible');
 assert.deepEqual(itemsForCategory(items,'account').map(i=>i.id),['passport','control']);
});
test('all authorized routes have exactly one discoverable destination',()=>{
 const ids=availableCategories(items).flatMap(c=>itemsForCategory(items,c.id).map(i=>i.id));
 for(const item of items.filter(item=>item.status!=='soon'))assert.ok(ids.includes(item.id));
 assert.equal(ids.includes('games'),false);
 assert.equal(ids.includes('member'),false);assert.deepEqual(partitionDestinations(),{available:[],upcoming:[]});
});


test('global Boussole search shares World aliases for nutrition, recipes and food scanning',()=>{
 const live=[
  {id:'health',label:'Santé',description:'Manger, bouger et prendre soin de soi.'},
  {id:'foodscan',label:'Scanner alimentaire',description:'Scanner des produits.'},
  {id:'world3b',label:'Monde du 3B',description:'Huit portes.'}
 ];
 assert.deepEqual(searchNavigation(live,'nutrition').map(item=>item.id),['health','foodscan']);
 assert.deepEqual(searchNavigation(live,'recettes').map(item=>item.id),['health']);
 assert.deepEqual(searchNavigation(live,'code barre').map(item=>item.id),['foodscan']);
 assert.deepEqual(searchNavigation(live,'kaïs').map(item=>item.id),['world3b']);
});
