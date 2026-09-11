// Produces the exact shared reducer files used in the deployed Edge Function.
// Usage: node scripts/prepare-world-engine.mjs /absolute/path/to/deployment.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide an output JSON path outside the repository.');
const files=['engine.js','rules.js','catalog.js','chapters.js','adventure-state.js','avatar-rules.js','settlements.js','wardrobe.js','cards-source.json'].map(name=>{
 let content=fs.readFileSync(path.join(root,'src/world',name),'utf8').replace(/^\uFEFF/,'');
 if(name.endsWith('.json'))content=JSON.stringify(JSON.parse(content));
 return {name,content};
});
files.push({name:'index.ts',content:fs.readFileSync(path.join(root,'supabase/functions/world-engine/index.ts'),'utf8')});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{allowJs:true,checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' files. Deploy index.ts with deno.json as the import map.');
