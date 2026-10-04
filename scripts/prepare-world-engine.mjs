// Produces the exact shared reducer files used in the deployed Edge Function.
// Usage: node scripts/prepare-world-engine.mjs /absolute/path/to/deployment.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide an output JSON path outside the repository.');
const names=new Set();
const localImports=source=>[...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map(match=>match[1]);
function visit(name){
 const normalized=path.posix.normalize(name).replace(/^\.\//,'');
 if(path.posix.isAbsolute(normalized)||normalized==='..'||normalized.startsWith('../'))throw Error('World reducer import escapes src/world: '+name);
 if(names.has(normalized))return;
 names.add(normalized);
 const source=fs.readFileSync(path.join(root,'src/world',normalized),'utf8');
 const base=path.posix.dirname(normalized);
 for(const relative of localImports(source)){
  visit(path.posix.join(base,relative));
 }
}
const entrypoint=fs.readFileSync(path.join(root,'supabase/functions/world-engine/index.ts'),'utf8');
for(const relative of localImports(entrypoint))visit(relative);
const files=[...names].map(name=>{
 let content=fs.readFileSync(path.join(root,'src/world',name),'utf8').replace(/^\uFEFF/,'');
 if(name.endsWith('.json'))content=JSON.stringify(JSON.parse(content));
 return {name,content};
});
files.push({name:'index.ts',content:entrypoint});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{allowJs:true,checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' files. Deploy index.ts with deno.json as the import map.');
