import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):/\.[jt]sx?$/.test(entry.name)?[join(dir,entry.name)]:[]);}

test('icons cannot shadow JavaScript constructors used by the same component',()=>{
 const broken=[];
 for(const path of files(fileURLToPath(new URL('../src',import.meta.url)))){
  const source=readFileSync(path,'utf8');
  for(const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)){
   for(const declaration of match[1].split(',')){
    const local=declaration.trim().split(/\s+as\s+/).at(-1);
    if(['Map','Set','Date','Promise','URL','Image','Array','Error','Object'].includes(local)&&new RegExp('\\bnew\\s+'+local+'\\s*\\(').test(source))broken.push(path+': '+local);
   }
  }
 }
 assert.deepEqual(broken,[], 'Alias an icon (for example Map as MapIcon) instead of replacing a runtime constructor.');
});
