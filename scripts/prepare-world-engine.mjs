// Produces the exact shared reducer files used in the deployed Edge Function.
// Usage: node scripts/prepare-world-engine.mjs /absolute/path/to/deployment.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide an output JSON path outside the repository.');
const names=new Set();
function visit(name){
 const normalized=path.posix.normalize(name).replace(/^\.\//,'');
 if(path.posix.isAbsolute(normalized)||normalized.startsWith('../')||normalized==='..'||normalized.includes('\\'))throw Error('World dependency outside src/world: '+name);
 if(names.has(normalized))return;
 names.add(normalized);
 const source=fs.readFileSync(path.join(root,'src/world',normalized),'utf8');
 const base=path.posix.dirname(normalized);
 for(const match of source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)){
  visit(path.posix.join(base,match[1]));
 }
}
const entry=fs.readFileSync(path.join(root,'supabase/functions/world-engine/index.ts'),'utf8');
for(const match of entry.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g))visit(match[1]);
const files=[...names].map(name=>{
 let content=fs.readFileSync(path.join(root,'src/world',name),'utf8').replace(/^\uFEFF/,'');
 return {name,content};
});
files.push({name:'index.ts',content:entry});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' files. Deploy index.ts with deno.json as the import map.');
