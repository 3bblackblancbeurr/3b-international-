// Run after Meshopt compression; file sizes and hashes describe shipped assets.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../public/world/paris/',import.meta.url),file=new URL('manifest.json',dir),manifest=JSON.parse(fs.readFileSync(file));
for(const model of manifest.models){
 for(const [key,suffix] of [['detail',''],['distance','-lod']]){
  const name=model.name+suffix+'.glb',bytes=fs.readFileSync(new URL(name,dir));
  if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB: '+name);
  model[key]={file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 }
}
manifest.compression='EXT_meshopt_compression';
manifest.geometry='Original procedural Blender meshes, inspired by Paris architecture; not photogrammetry or a measured city replica.';
manifest.textures='textures/sources.json';
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.models.length+' models / '+manifest.models.reduce((n,m)=>n+m.detail.bytes+m.distance.bytes,0)+' bytes for both levels');
