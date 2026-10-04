import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';

const tintClass=name=>/SkinColor|HandsColor/.test(name)?1:/HairColor/.test(name)?3:/ClothColor/.test(name)?2:/TrouserColor/.test(name)?4:/BootColor/.test(name)?5:0;
const prototypes=new WeakMap();

function indicesFor(mesh,targetRatio){
 const geo=mesh.geometry,index=geo.index?.array||Uint32Array.from({length:geo.attributes.position.count},(_,i)=>i),position=geo.attributes.position,uv=geo.attributes.uv,normal=geo.attributes.normal;
 const packed=new Float32Array(position.count*3),attributes=new Float32Array(position.count*5);
 for(let i=0;i<position.count;i++){packed.set([position.getX(i),position.getY(i),position.getZ(i)],i*3);attributes.set([normal?.getX(i)||0,normal?.getY(i)||1,normal?.getZ(i)||0,uv?.getX(i)||0,uv?.getY(i)||0],i*5);}
 const target=Math.max(12,Math.floor(index.length*targetRatio/3)*3);
 return MeshoptSimplifier.simplifyWithAttributes(index,packed,3,attributes,5,[.3,.3,.3,.6,.6],null,target,.08,['LockBorder'])[0];
}

export function crowdMeshLodIndices(mesh,lod='near'){
 const detailed=/SkinColor|EyeColor|HairColor/.test(mesh.material.name),baseline=detailed?.66:.22;
 const near=/ClothColor_ClothColor/.test(mesh.material.name)?.40:baseline;
 return indicesFor(mesh,lod==='far'?baseline*.32:near);
}

function diffuseAtlas(meshes){
 const entries=[],lookup=new Map(),size=512,columns=4,cell=size/columns,padding=2;
 for(const mesh of meshes){const mat=mesh.material,key=mat.map?.uuid||mat.uuid;if(!lookup.has(key)){lookup.set(key,entries.length);entries.push(mat);}}
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;let texture=null;
 if(canvas){canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);for(const [index,mat] of entries.entries()){
   const x=(index%columns)*cell,y=Math.floor(index/columns)*cell,image=mat.map?.image;
   if(image)ctx.drawImage(image,x+padding,y+padding,cell-padding*2,cell-padding*2);
   else{ctx.fillStyle='#'+mat.color.getHexString();ctx.fillRect(x+padding,y+padding,cell-padding*2,cell-padding*2);}
   // Extruded tile borders prevent bilinear sampling bleeding from another garment.
   ctx.drawImage(canvas,x+padding,y+padding,1,cell-padding*2,x,y+padding,padding,cell-padding*2);
   ctx.drawImage(canvas,x+cell-padding-1,y+padding,1,cell-padding*2,x+cell-padding,y+padding,padding,cell-padding*2);
   ctx.drawImage(canvas,x,y+padding,cell,1,x,y,cell,padding);
   ctx.drawImage(canvas,x,y+cell-padding-1,cell,1,x,y+cell-padding,cell,padding);
  }texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;}}
 return {texture,uv(mesh,u,v){const index=lookup.get(mesh.material.map?.uuid||mesh.material.uuid);return[((index%columns)*cell+padding+Math.max(0,Math.min(1,u))*(cell-padding*2))/size,(Math.floor(index/columns)*cell+padding+Math.max(0,Math.min(1,v))*(cell-padding*2))/size];}};
}

/** One clone and mixer bake the shipped, skinned human once. No resident keeps
 * a skeleton or mixer. Two LODs reuse the same bounded vertex animation atlas. */
async function bakeCrowdPrototype(asset,{frames=16,height=3.35}={}){
 if(!asset?.scene)throw Error('La foule attend son modèle humain livré.');
 await MeshoptSimplifier.ready;
 const model=clone(asset.scene),meshes=[];model.updateMatrixWorld(true);
 model.traverse(o=>{
  const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);
  if(hair)o.visible=Number(hair[1])===3;if(boots)o.visible=Number(boots[1])===0;
 });
 model.traverse(o=>{if(o.isMesh&&o.visible){let visible=true;for(let p=o.parent;p;p=p.parent)if(!p.visible)visible=false;if(visible)meshes.push(o);}});
 if(!meshes.length)throw Error('Le modèle humain ne contient aucune silhouette visible.');
 const atlas=diffuseAtlas(meshes),indicesNear=[],indicesFar=[],records=[];let vertexCount=0;
 for(const mesh of meshes){
  const near=crowdMeshLodIndices(mesh),far=crowdMeshLodIndices(mesh,'far'),used=[...new Set([...near,...far])],remap=new Map(used.map((v,i)=>[v,vertexCount+i]));
  for(const index of near)indicesNear.push(remap.get(index));for(const index of far)indicesFar.push(remap.get(index));
  for(const index of used)records.push({mesh,index});
  vertexCount+=used.length;
 }
 const positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),uvs=new Float32Array(vertexCount*2),tints=new Float32Array(vertexCount),vertexIds=new Float32Array(vertexCount);
 for(const [i,{mesh,index}] of records.entries()){
  const uv=mesh.geometry.attributes.uv;uvs.set(atlas.uv(mesh,uv?.getX(index)||0,uv?.getY(index)||0),i*2);tints[i]=tintClass(mesh.material.name);vertexIds[i]=i;
 }
 const clip=asset.animations?.find(c=>c.name==='Walk'),idle=asset.animations?.find(c=>c.name==='Idle'),mixer=new THREE.AnimationMixer(model);
 if(clip)mixer.clipAction(clip).play();else if(idle)mixer.clipAction(idle).play();
 const width=256,rows=Math.ceil(vertexCount/width),textureHeight=rows*frames,positionData=new Uint16Array(width*textureHeight*4),normalData=new Uint16Array(positionData.length);
 const point=new THREE.Vector3(),normal=new THREE.Vector4(),bound=new THREE.Box3(),framePoints=new Float32Array(vertexCount*3),frameNormals=new Float32Array(vertexCount*3);let normalizeScale=1,baseX=0,baseZ=0;
 for(let frame=0;frame<frames;frame++){
  mixer.setTime(clip?frame/frames*clip.duration:0);model.updateMatrixWorld(true);let minimumY=Infinity;
  bound.makeEmpty();
  for(const [i,{mesh,index}] of records.entries()){
   point.fromBufferAttribute(mesh.geometry.attributes.position,index);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(index,point);point.applyMatrix4(mesh.matrixWorld);framePoints.set(point.toArray(),i*3);minimumY=Math.min(minimumY,point.y);bound.expandByPoint(point);
   const n=mesh.geometry.attributes.normal;normal.set(n?.getX(index)||0,n?.getY(index)||1,n?.getZ(index)||0,0);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(index,normal);normal.applyMatrix4(mesh.matrixWorld);point.set(normal.x,normal.y,normal.z).normalize();frameNormals.set(point.toArray(),i*3);
  }
  if(frame===0){normalizeScale=height/Math.max(.01,bound.max.y-bound.min.y);baseX=(bound.max.x+bound.min.x)/2;baseZ=(bound.max.z+bound.min.z)/2;}
  for(let i=0;i<vertexCount;i++){
   const offset=(frame*rows*width+i)*4,p=i*3;
   const x=(framePoints[p]-baseX)*normalizeScale,y=(framePoints[p+1]-minimumY)*normalizeScale,z=(framePoints[p+2]-baseZ)*normalizeScale;
   positionData[offset]=THREE.DataUtils.toHalfFloat(x);positionData[offset+1]=THREE.DataUtils.toHalfFloat(y);positionData[offset+2]=THREE.DataUtils.toHalfFloat(z);positionData[offset+3]=THREE.DataUtils.toHalfFloat(1);
   for(let c=0;c<3;c++)normalData[offset+c]=THREE.DataUtils.toHalfFloat(frameNormals[p+c]);
   if(frame===0){positions.set([x,y,z],p);normals.set(frameNormals.subarray(p,p+3),p);}
  }
 }
 mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});
 const texture=data=>{const t=new THREE.DataTexture(data,width,textureHeight,THREE.RGBAFormat,THREE.HalfFloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;};
 const bakedPositions=texture(positionData),bakedNormals=texture(normalData),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setAttribute('crowdTintClass',new THREE.BufferAttribute(tints,1));geometry.setAttribute('crowdVertexId',new THREE.BufferAttribute(vertexIds,1));geometry.setIndex(indicesNear);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.35;
 const low=geometry.clone();low.setIndex(indicesFar);
 return {geometry,low,map:atlas.texture,bakedPositions,bakedNormals,frames,rows,width,textureHeight,duration:clip?.duration||1,
  diagnostics:{vertices:vertexCount,nearTriangles:indicesNear.length/3,farTriangles:indicesFar.length/3,animationBytes:positionData.byteLength+normalData.byteLength,frames,source:'shipped-traveller-glb'},
  dispose(){geometry.dispose();low.dispose();atlas.texture?.dispose();bakedPositions.dispose();bakedNormals.dispose();}};
}

/** CPU bake data survive a district rebuild through the loaded asset's lifetime;
 * every crowd owns and disposes its GPU buffers/textures independently. */
export async function bakeCrowdHuman(asset,options={}){
 if(!asset?.scene)throw Error('La foule attend son modèle humain livré.');
 let cache=prototypes.get(asset);if(!cache){cache=new Map();prototypes.set(asset,cache);}
 const key=JSON.stringify({frames:options.frames||16,height:options.height||3.35});
 if(!cache.has(key))cache.set(key,bakeCrowdPrototype(asset,options));
 const source=await cache.get(key),geometry=source.geometry.clone(),low=source.low.clone(),map=source.map?.clone()||null,bakedPositions=source.bakedPositions.clone(),bakedNormals=source.bakedNormals.clone();
 if(map)map.needsUpdate=true;bakedPositions.needsUpdate=bakedNormals.needsUpdate=true;
 return {...source,geometry,low,map,bakedPositions,bakedNormals,dispose(){geometry.dispose();low.dispose();map?.dispose();bakedPositions.dispose();bakedNormals.dispose();}};
}

export function crowdHumanMaterial(baked,walkTime,walkActive,{lastUpdateTime={value:0},updateInterval={value:.25}}={}){
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',map:baked.map,side:THREE.DoubleSide,roughness:.84,metalness:0,envMapIntensity:.18});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{crowdWalkTime:walkTime,crowdWalkActive:walkActive,crowdLastUpdateTime:lastUpdateTime,crowdUpdateInterval:updateInterval,crowdClipDuration:{value:baked.duration},crowdPositionAtlas:{value:baked.bakedPositions},crowdNormalAtlas:{value:baked.bakedNormals}});
  const prelude=`attribute float crowdVertexId;attribute float crowdTintClass;attribute float crowdPhase;attribute float crowdSpeed;attribute float crowdTravel;attribute vec3 crowdSkin;attribute vec3 crowdCloth;attribute vec3 crowdHair;uniform float crowdWalkTime;uniform float crowdWalkActive;uniform float crowdLastUpdateTime;uniform float crowdUpdateInterval;uniform float crowdClipDuration;uniform sampler2D crowdPositionAtlas;uniform sampler2D crowdNormalAtlas;varying vec3 crowdSurfaceTint;varying float crowdPreserveColor;
   vec3 crowdFetch(sampler2D atlas,float frame){float row=floor(crowdVertexId/${baked.width}.);return texture2D(atlas,vec2((mod(crowdVertexId,${baked.width}.)+.5)/${baked.width}.,(frame*${baked.rows}.+row+.5)/${baked.textureHeight}.)).xyz;}
   vec3 crowdAnimated(sampler2D atlas){float frame=fract(crowdPhase+crowdWalkTime*crowdSpeed/crowdClipDuration*crowdWalkActive)*${baked.frames}.;return mix(crowdFetch(atlas,floor(frame)),crowdFetch(atlas,mod(floor(frame)+1.,${baked.frames}.)),fract(frame));}
  `;
  shader.vertexShader=prelude+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nobjectNormal=normalize(crowdAnimated(crowdNormalAtlas));`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed=crowdAnimated(crowdPositionAtlas);transformed.z+=clamp(crowdWalkTime-crowdLastUpdateTime,0.,crowdUpdateInterval)*crowdTravel*crowdWalkActive;crowdPreserveColor=crowdTintClass<.5?1.:0.;crowdSurfaceTint=crowdTintClass<1.5?crowdSkin:crowdTintClass<2.5?crowdCloth:crowdTintClass<3.5?crowdHair:crowdTintClass<4.5?mix(crowdCloth,vec3(.08),.38):vec3(.105,.08,.06);`);
  shader.fragmentShader='varying vec3 crowdSurfaceTint;varying float crowdPreserveColor;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nif(crowdPreserveColor<.5){float shade=pow(max(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),.001),.35);diffuseColor.rgb=crowdSurfaceTint*shade;}`);
 };
 material.customProgramCacheKey=()=>`3b-shipped-human-vat-${baked.frames}-${baked.rows}-${baked.textureHeight}`;
 return material;
}
