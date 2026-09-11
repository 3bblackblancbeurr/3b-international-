import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='public/world/districts/',path=dir+'manifest.json',manifest=JSON.parse(fs.readFileSync(path));
manifest.compression='EXT_meshopt_compression';
manifest.materials='Original palettes; plaster maps shared from the CC0 sources in ../paris/textures/sources.json';
for(const model of manifest.models){
 model.files=['','-lod'].map(suffix=>{const file=model.name+suffix+'.glb',bytes=fs.readFileSync(dir+file);return{file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
}
fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.models.length+' regional buildings, '+manifest.models.reduce((sum,m)=>sum+m.files.reduce((n,f)=>n+f.bytes,0),0)+' bytes total');
