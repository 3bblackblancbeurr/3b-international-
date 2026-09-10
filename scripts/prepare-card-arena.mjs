import fs from 'node:fs';
if(!process.argv[2])throw Error('Provide an output JSON file outside the repository.');
const files=['rules.js','catalog.js','chapters.js','adventure-state.js','avatar-rules.js','cards-source.json'].map(name=>({name,content:fs.readFileSync('src/world/'+name,'utf8').replace(/^\uFEFF/,'')}));
files.push({name:'duel.js',content:fs.readFileSync('src/arena/duel.js','utf8').replaceAll("'../world/catalog.js'","'./catalog.js'")});
files.push({name:'index.ts',content:fs.readFileSync('supabase/functions/card-arena/index.ts','utf8')});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{allowJs:true,checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' arena files.');
