import c0 from './weapon-art/chunk-0.js';
import c1 from './weapon-art/chunk-1.js';
import c2 from './weapon-art/chunk-2.js';
import c3 from './weapon-art/chunk-3.js';
import c4 from './weapon-art/chunk-4.js';
import c5 from './weapon-art/chunk-5.js';
import c6 from './weapon-art/chunk-6.js';

export const WEAPON_ART_ATLAS='data:image/webp;base64,'+[c0,c1,c2,c3,c4,c5,c6].join('');

const SLOT={
 heritage:0,paris:4,romano:8,tallinn:6,bosphore:2,alger:1,carthage:9,zellige:3,
 abanico:3,scissors:5,axe:7,saber:0,bow:8,claws:3,wings:9,thread:4
};

const DISPLAY_NAMES={
 heritage:'Sabre Royal',paris:'Lance Royale',romano:'Arc Héritage',tallinn:'Tallinn Zero',
 bosphore:'Lame du Bosphore',alger:'Lumière d’Alger',carthage:'Trident Saphir',
 zellige:'Zellige Royal',abanico:'Abanico Rojo',scissors:'Lames Jumelles',
 axe:'Hache du Nord',saber:'Sabre des Passages',bow:'Arc des Horizons',
 claws:'Griffes du Loup',wings:'Ailes de Résonance',thread:'Fil Fantôme'
};

const clamp=value=>Math.max(1,Math.min(10,Math.round(value)));

export function weaponArtStyle(id){
 const slot=SLOT[id]??0,col=slot%5,row=Math.floor(slot/5);
 return {backgroundPosition:`${col*25}% ${row*100}%`};
}

export const weaponDisplayName=weapon=>DISPLAY_NAMES[weapon.id]||weapon.name;

export function weaponStats(weapon){
 return {
  power:clamp((weapon.damage/1.4)*10),
  speed:clamp(((1.8-weapon.speed)/1.1)*9+1),
  range:clamp((weapon.range/1.8)*10)
 };
}
