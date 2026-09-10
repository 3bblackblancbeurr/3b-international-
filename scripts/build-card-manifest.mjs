import fs from 'node:fs';import crypto from 'node:crypto';
import {CARDS} from '../src/world/catalog.js';import {CARD_DESIGNS} from '../src/world/card-designs.js';
const cards=CARDS.map(card=>{
 const path='public/world/card-models/'+card.id+'.glb',b=fs.readFileSync(path),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),design=CARD_DESIGNS[card.id];
 if(!j.nodes.some(n=>n.extras?.cardId===card.id))throw Error('Wrong source identity: '+card.id);
 const animations=j.animations?.map(a=>a.name)||[];
 if(card.character&&!['Idle','Walk','Run','Attack','Hit','Death','Cast'].every(n=>animations.includes(n)))throw Error('Missing motion: '+card.id);
 if(['person','guardian'].includes(design.kind)&&!j.skins?.length)throw Error('Missing skin: '+card.id);
 if(design.kind==='person'&&!j.materials.some(m=>/ClothColor_ClothColor/.test(m.name)))throw Error('Merged clothing material: '+card.id);
 return {id:card.id,name:card.name,country:card.country,category:card.category,kind:design.kind,url:'/world/card-models/'+card.id+'.glb',bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),animations,meshes:j.meshes.length};
});
fs.writeFileSync('public/world/card-models/manifest.json',JSON.stringify({edition:'3b-local-1',source:'Original 368 card catalogue; stylized local Blender adaptations, shared Quaternius CC0 character topology.',total:cards.length,bytes:cards.reduce((n,c)=>n+c.bytes,0),cards},null,2));
console.log('CARD_MANIFEST_VERIFIED',cards.length,cards.reduce((n,c)=>n+c.bytes,0));
