import {CARDS,COUNTRIES} from './catalog.js';
import {ORIGINAL_ART} from './art.js';
import layouts from './portrait-layouts.json' with {type:'json'};
export const ADAPTED_ART={};
for(const country of COUNTRIES.filter(c=>c.id!=='france'))CARDS.filter(c=>c.country===country.id&&c.category==='Personnage classique').forEach((c,i)=>{ADAPTED_ART[c.id]={src:'/world/cards/'+country.id+'-portraits.webp',columns:4,rows:5,index:i,width:4,height:5,portrait:[i%4,Math.floor(i/4),1,1]};});
for(const [i,c] of CARDS.filter(c=>c.category==='Carte unique').entries())ADAPTED_ART[c.id]={src:'/world/cards/supremes-portraits.webp',columns:4,rows:2,index:i,width:4,height:2,portrait:[i%4,Math.floor(i/4),1,1]};
for(const [i,id] of ['C161','C162','C163','C164'].entries())ADAPTED_ART[id]={src:'/world/cards/union-portraits.webp',columns:2,rows:2,index:i,width:2,height:2,portrait:[i%2,Math.floor(i/2),1,1]};
export const portraitArt=id=>ORIGINAL_ART[id]||ADAPTED_ART[id];
for(const art of Object.values(ADAPTED_ART)){const id=art.src.split('/').at(-1).replace('-portraits.webp',''),layout=layouts[id];if(layout){art.width=layout.width;art.height=layout.height;art.portrait=layout.portraits[art.index];}}
