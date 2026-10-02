import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createHeritageMonument} from '../src/world/heritage-monument.js';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(e=>this.onerror?.(e));}};
const destination=path.resolve(process.argv[2]||'/tmp/3b-world-art/cercle-brise.glb');
const asset=createHeritageMonument();
try{
 const bytes=await new GLTFExporter().parseAsync(asset.root,{binary:true,onlyVisible:true});
 await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,Buffer.from(bytes));
 await writeFile(destination.replace(/\.glb$/i,'')+'-collision.json',JSON.stringify({units:'world units; nominal avatar height 3.8',origin:'ground center',supports:asset.collisions},null,2));
 console.log(JSON.stringify({path:destination,bytes:bytes.byteLength,meshes:asset.root.children.length}));
}finally{asset.dispose();}
