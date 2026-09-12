import {Document,NodeIO} from '../../3b-asset-tools/node_modules/@gltf-transform/core/dist/index.js';
import {createEiffelTower} from '../src/world/eiffel-tower.js';

// Export the same Y-up authored geometry used by Three.js, without a DCC conversion.
const io=new NodeIO();
for(const detail of [true,false]){
 const tower=createEiffelTower({height:60,detail}),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Paris');
 doc.getRoot().setDefaultScene(scene);
 let triangles=0;
 for(const [i,source] of tower.children.entries()){
  const geometry=source.geometry,material=source.material;
  const attr=(name,type,array)=>doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
  const p=doc.createPrimitive().setAttribute('POSITION',attr('position','VEC3',geometry.attributes.position.array)).setAttribute('NORMAL',attr('normal','VEC3',geometry.attributes.normal.array)).setIndices(attr('indices','SCALAR',geometry.index.array));
  p.setMaterial(doc.createMaterial(['Painted iron','Platforms and fittings','Stone footings'][i]).setBaseColorFactor([...material.color.toArray(),1]).setRoughnessFactor(material.roughness).setMetallicFactor(material.metalness));
  scene.addChild(doc.createNode('Eiffel '+i).setMesh(doc.createMesh().addPrimitive(p)));
  triangles+=geometry.index.count/3;geometry.dispose();material.dispose();
 }
 const path='public/world/paris/Eiffel'+(detail?'':'-lod')+'.glb';await io.write(path,doc);console.log(path,triangles+' triangles');
}
