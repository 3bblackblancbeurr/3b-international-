import {BufferAttribute} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Keep authored vertex reuse when batching. Expanding indexed primitives
 * duplicates positions, normals and UVs every time a scene is assembled.
 * Unindexed sources get an identity index; no tolerance welding, lost seams,
 * changed triangle order, source mutation or expensive hash pass is needed. */
export function mergeIndexedGeometries(geometries,useGroups=false){
 const temporary=[];
 const indexed=geometries.map(source=>{
  if(source.index)return source;
  const geometry=source.clone(),count=source.attributes.position.count;
  const indices=count>65535?new Uint32Array(count):new Uint16Array(count);
  for(let i=0;i<count;i++)indices[i]=i;
  geometry.setIndex(new BufferAttribute(indices,1));temporary.push(geometry);return geometry;
 });
 try{return mergeGeometries(indexed,useGroups);}finally{temporary.forEach(g=>g.dispose());}
}
