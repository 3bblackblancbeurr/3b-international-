import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

/** Node has no image decoder. Preserve real compressed geometry, skeleton,
 * animation and named materials; only omit image bindings for geometry tests. */
export async function loadShippedCrowdFixture(index=0){
 const bytes=await readFile(new URL('../public/world/living/traveller-'+index+'.glb',import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
 for(const material of json.materials||[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}}
 delete json.images;delete json.textures;
 const text=Buffer.from(JSON.stringify(json)),paddedLength=Math.ceil(text.length/4)*4,binary=bytes.subarray(20+length),output=Buffer.alloc(20+paddedLength+binary.length,32);
 output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);output.writeUInt32LE(paddedLength,12);output.writeUInt32LE(0x4e4f534a,16);text.copy(output,20);binary.copy(output,20+paddedLength);
 return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength),'');
}
