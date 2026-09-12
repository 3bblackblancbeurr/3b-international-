import {NodeIO} from '../../3b-asset-tools/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../../3b-asset-tools/node_modules/@gltf-transform/extensions/dist/index.js';
import {dedup,weld,prune,meshopt} from '../../3b-asset-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptEncoder,MeshoptDecoder} from '../../3b-asset-tools/node_modules/meshoptimizer/index.js';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const file of ['Eiffel.glb','Eiffel-lod.glb']){const path='public/world/paris/'+file,doc=await io.read(path);await doc.transform(dedup(),weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(path,doc);console.log(file);}
