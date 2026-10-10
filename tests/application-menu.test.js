import test from 'node:test';
import assert from 'node:assert/strict';
import { availableCategories, itemsForCategory, searchNavigation, partitionDestinations } from '../src/components/navigation-menu.js';
const items=[{id:'passport',label:'Passeport'},{id:'invisible',label:'Monde caché'},{id:'games',label:'Jeux',status:'soon'},{id:'shop',label:'Boutique'},{id:'control',label:'Commande'},{id:'guide',label:'Guide'}];
test('live destinations stay separate from unfinished spaces without losing links',()=>{
 const world=itemsForCategory(items,'world');const {available,upcoming}=partitionDestinations(world);
 assert.deepEqual(available.map(i=>i.id),['invisible']);assert.deepEqual(upcoming.map(i=>i.id),['games']);
 assert.equal(searchNavigation(items,'jeux')[0].status,'soon');assert.equal(searchNavigation(items,'cache')[0].id,'invisible');
 assert.deepEqual(itemsForCategory(items,'account').map(i=>i.id),['passport','control']);
});
test('all authorized routes have exactly one discoverable destination',()=>{
 const ids=availableCategories(items).flatMap(c=>itemsForCategory(items,c.id).map(i=>i.id));
 for(const item of items)assert.ok(ids.includes(item.id));
 assert.equal(ids.includes('member'),false);assert.deepEqual(partitionDestinations(),{available:[],upcoming:[]});
});
