import fs from 'node:fs';
const [input,output='src/world/cards-source.json']=process.argv.slice(2);
if(!input)throw Error('Usage: node scripts/import-world-catalog.mjs extracted-workbook.json [output.json]');
const workbook=JSON.parse(fs.readFileSync(input,'utf8'));
const rows=workbook['Catalogue 368'];
if(!Array.isArray(rows)||rows.length!==369)throw Error('368 cartes attendues dans Catalogue 368.');
const cards=rows.slice(1).map(row=>{
 const [number,id,category,subtype,country,rarity,name,cost,attack,defense,effect,condition,source]=row;
 if(id!=='C'+String(number).padStart(3,'0')||!name||!source)throw Error('Ligne invalide : '+number);
 return{id,number,category,subtype,country,rarity,name,cost,attack,defense,effect,condition,source};
});
if(new Set(cards.map(c=>c.id)).size!==368)throw Error('Identifiants dupliqués.');
fs.writeFileSync(output,JSON.stringify({title:'3B WORLD CARDS — Les 8 Portes',edition:'Dossier V4 reconstruit',source:'https://chatgpt.com/share/6aa29cdc-7494-83eb-b6e2-08dfe43badac',cards,rules:workbook['Règles complètes'].slice(1)},null,2)+'\n');
console.log('368 cartes importées avec leurs identifiants et leur provenance.');
