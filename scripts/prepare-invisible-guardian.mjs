// Creates a self-contained Supabase deployment payload from the canonical client story.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Provide an output JSON path.');
const names=new Set(),imports=source=>[...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map(row=>row[1]);
function visit(name){
 name=path.posix.normalize(name);
 if(name.startsWith('../')||path.posix.isAbsolute(name))throw Error('Story import escapes src/world.');
 if(names.has(name))return;names.add(name);
 const content=fs.readFileSync(path.join(root,'src/world',name),'utf8');
 for(const relative of imports(content))visit(path.posix.join(path.posix.dirname(name),relative));
}
visit('invisible/catalog.js');visit('invisible/progression.js');
const folder=path.join(root,'supabase/functions/invisible-guardian');
const files=['index.ts','handler.js'].map(name=>({name,content:fs.readFileSync(path.join(folder,name),'utf8').replaceAll('../../../src/world/','./world/')}));
files.push({name:'guardian-story.js',content:fs.readFileSync(path.join(root,'src/world/invisible/guardian-story.js'),'utf8')});
for(const name of names)files.push({name:'world/'+name,content:fs.readFileSync(path.join(root,'src/world',name),'utf8')});
files.push({name:'deno.json',content:JSON.stringify({compilerOptions:{allowJs:true,checkJs:false}})});
fs.writeFileSync(process.argv[2],JSON.stringify(files));
console.log('Prepared '+files.length+' files for invisible-guardian, index.ts and deno.json.');
