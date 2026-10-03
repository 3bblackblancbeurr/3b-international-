// Produces the exact shared reducer files used in the deployed Edge Function.
// Usage: node scripts/prepare-world-engine.mjs /absolute/path/to/deployment.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide an output JSON path outside the repository.');
const names=new Set();
const sources=new Map();
const entryPath=path.join(root,'supabase/functions/world-engine/index.ts');
function visit(name){
 const normalized=path.posix.normalize(name).replace(/^\.\//,'');
 if(normalized.startsWith('../')||path.posix.isAbsolute(normalized)||normalized.includes('\\'))throw Error('Import outside the world-engine package: '+name);
 if(names.has(normalized))return;
 names.add(normalized);
 const source=fs.readFileSync(normalized==='index.ts'?entryPath:path.join(root,'src/world',normalized),'utf8').replace(/^\uFEFF/,'');
 sources.set(normalized,source);
 const base=path.posix.dirname(normalized);
 // Start at the actual endpoint so server-only dependencies such as the reward
 // outbox selector cannot be omitted. Include parent-relative and side-effect
 // imports as well as static re-exports and literal dynamic imports.
 for(const match of source.matchAll(/(?:\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?|\bimport\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)){
  visit(path.posix.join(base,match[1]));
 }
}
visit('index.ts');
const files=[...names].map(name=>{
 let content=sources.get(name);
 if(name.endsWith('.json'))content=JSON.stringify(JSON.parse(content));
 return {name,content};
});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{allowJs:true,checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' files. Deploy index.ts with deno.json as the import map.');
