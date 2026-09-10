import {CARDS,COUNTRIES,countryById,cardSlot} from './catalog.js';
import {SKINS} from './avatar-rules.js';
// Art direction for local Blender adaptations. Original IDs and illustrations remain intact.
const palettes={france:['#151c2a','#bd9650','#244c7d'],italie:['#172b26','#c4a15d','#417963'],estonie:['#203746','#a6c7cc','#457c9b'],turquie:['#302331','#b28745','#985058'],algerie:['#24362c','#c4a267','#728055'],tunisie:['#eee1bd','#2d7493','#b76752'],maroc:['#664333','#d5ad66','#30736d'],espagne:['#37282b','#d8ad66','#ad5442'],'3b':['#242330','#e4d4a8','#7e688f']};
const frenchWomen=[3,6,9,12,15,18,20];
export function designFor(card){
 const n=card.number,local=(n-1)%20,country=card.country,palette=palettes[country],supreme=card.category==='Carte unique';
 let kind=card.character?'person':({Terrain:'landscape',Ambiance:'aura',Bonus:'relic','Énergie':'energy','Fragment / Pierre':cardSlot(card)==='pierre'?'stone':'fragment',Mission:'scroll',Passeport:'passport','Piège':'trap',Porte:'gate',Stratégie:'strategy'})[card.category];
 // French source cards depict humans even when their names mention an animal.
 if(card.character&&country!=='france'&&country!=='3b'&&!supreme&&(local%5===4||/loup|fennec|lion|ours|aigle|cerf|lynx|taureau/i.test(card.name)))kind='spirit';
 if(supreme)kind='guardian';
 const body=country==='france'?(frenchWomen.includes(n)?1:0):(local%5===3||local%7===5?1:0),style=local%5===1?2:local%5===2?1:local%3;
 return {id:card.id,kind,country,body,style,asset:kind==='person'?'traveller-'+(body*3+style):kind==='guardian'?'creature-'+Math.max(0,COUNTRIES.findIndex(c=>c.id===country)):null,
  skin:SKINS[(local+Math.max(0,COUNTRIES.findIndex(c=>c.id===country)))%SKINS.length],cloth:palette[local%3===1?2:0],trim:palette[1],accent:countryById[country]?.color||'#e6d8b6',hair:body?([2,4,5][local%3]):([1,3,0][local%3]),hairColor:['#33271f','#473226','#b49a6a','#222326','#685049'][local%5],boots:local%3,
  shape:['equilibre','elance','solide'][local%3],face:(local%5-2)/4,jaw:((local*3)%5-2)/4,nose:((local*7)%5-2)/5,height:.96+(local%5)*.025,
  ornament:local%8,mark:(n%8)+1,seed:n,description:card.character?`${card.name}, ${card.countryName} · ${card.role}`:card.trait};
}
export const CARD_DESIGNS=Object.fromEntries(CARDS.map(c=>[c.id,designFor(c)]));
