import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=Array.from({length:6},(_,i)=>path.join(root,'public/world/living/traveller-'+i+'.glb'));

export function readGlbJson(file){
 const bytes=fs.readFileSync(file);
 if(bytes.subarray(0,4).toString()!=='glTF')throw Error(path.basename(file)+' is not a GLB');
 const version=bytes.readUInt32LE(4);if(version!==2)throw Error(path.basename(file)+' is glTF '+version);
 let offset=12,json=null;
 while(offset+8<=bytes.length){
  const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8;
  const chunk=bytes.subarray(offset,offset+length);offset+=length;
  if(type===0x4E4F534A){json=JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,''));break;}
 }
 if(!json)throw Error(path.basename(file)+' JSON chunk missing');
 return json;
}

export function summarizeGlb(json){
 const nodes=(json.nodes||[]).map(x=>x.name).filter(Boolean);
 const animations=(json.animations||[]).map(x=>x.name||'unnamed');
 const morphTargets=[];
 for(const mesh of json.meshes||[]){
  const names=mesh.extras?.targetNames||[];
  const count=Math.max(names.length,...(mesh.primitives||[]).map(p=>p.targets?.length||0),0);
  for(let i=0;i<count;i++)morphTargets.push(names[i]||((mesh.name||'mesh')+':target_'+i));
 }
 return {nodes,animations,morphTargets:[...new Set(morphTargets)]};
}

if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const result={};
 for(const file of files){const json=readGlbJson(file);result[path.basename(file)]=summarizeGlb(json);}
 console.log(JSON.stringify(result,null,2));
}
