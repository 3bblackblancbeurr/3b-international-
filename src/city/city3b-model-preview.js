import * as THREE from 'three';
import {cityPreviewArt} from '../design-system/tokens.js';
import {buildCityArchitecture} from './city3b-building-model.js';
import {matrixTree} from './city3b-architecture.js';
import {cityBuildingKind} from './city3b-map.js';

const geometries={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.IcosahedronGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10)};
// Shared scale for the catalogue, placement ghost and saved buildings.
// Increase vertical presence within the existing parcel: roads and saves stay aligned.
export function cityBuildingHeight(w,d,kind,code=''){
 const small=Math.max(.7,Math.min(Number(w)||1,Number(d)||1));
 const type=String(code);
 const ratio=/TOWER|BUSINESS|OFFICE/.test(type)?2.4
  :/APARTMENT|RESIDENCE|HOUSING/.test(type)?1.8
  :type==='HOME_ORIGIN'?1.28
  :/CITY_HALL/.test(type)?1.7
  :/HOSPITAL/.test(type)?1.75
  :/CLINIC|SCHOOL|POLICE|COURT/.test(type)?1.45
  :/FACTORY|WORKS|DEPOT|SUPERMARKET/.test(type)?1.0
  :kind==='housing'?1.45:kind==='landmark'?2.5
  :kind==='green'||kind==='mobility'?.8:1.10;
 const floor=type==='CITY_HALL_3B'?11.5:/HOSPITAL|COURT/.test(type)?7:/SCHOOL|CLINIC|POLICE/.test(type)?5.5:type==='HOME_ORIGIN'?3.8:1.1;
 return Math.min(24,Math.max(floor,small*ratio));
}
export function cityModelPrimitives(definition={},footprint=definition.footprint||{},seed) {
 const w=Math.max(.7,Number(footprint.w??footprint.width)||1),d=Math.max(.7,Number(footprint.h??footprint.height)||1),kind=cityBuildingKind(definition),height=cityBuildingHeight(w,d,kind,definition.code),result=[];
 const parent={},shape=(_,geo,color,x,y,z,w,h,d,emissive=false)=>{const row={type:geo,color,x,y,z,w,h,d,emissive,rotation:{x:0,y:0,z:0}};result.push(row);return row;};
 const box=(p,...args)=>shape(p,'box',...args);
 const api={box,shape,sphereGeo:'sphere',cylinderGeo:'cylinder'};
 api.tree=(p,x,z,size)=>matrixTree(api,p,x,z,size);
 box(parent,0x657459,0,.012,0,w*1.05,.02,d*1.05);box(parent,0xc1bdaa,0,.04,0,w,.07,d);
 buildCityArchitecture(api,parent,{w,d,height,kind,code:definition.code||'',definition,ivory:0xdfded1,glass:0x2c6680,night:false,seed});
 return result;
}

// Rasterize the SAME geometry on Canvas2D: no second WebGL context, no external pictures.
export function cityPreviewTriangles(definition,footprint,seed) {
 const rows=cityModelPrimitives(definition,footprint,seed),rotation=new THREE.Euler(0,0,0),matrix=new THREE.Matrix4(),v=new THREE.Vector3(),normal=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),light=new THREE.Vector3(-.35,.85,.55).normalize(),out=[];
 const project=p=>({x:(p.x-p.z)*.7071,y:(p.x+p.z)*.36-p.y*.86,depth:(p.x+p.z)*.61+p.y*.51});
 for(const row of rows){const geo=geometries[row.type],pos=geo.attributes.position,index=geo.index;
  rotation.set(row.rotation.x,row.rotation.y,row.rotation.z);matrix.compose(new THREE.Vector3(row.x,row.y,row.z),new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(row.w,row.h,row.d));
  const length=index?index.count:pos.count;
  for(let i=0;i<length;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);a.fromBufferAttribute(pos,ids[0]).applyMatrix4(matrix);b.fromBufferAttribute(pos,ids[1]).applyMatrix4(matrix);c.fromBufferAttribute(pos,ids[2]).applyMatrix4(matrix);normal.subVectors(b,a).cross(v.subVectors(c,a)).normalize();if(normal.dot(new THREE.Vector3(.61,.51,.61))<=0)continue;
   const points=[a,b,c].map(project),color=new THREE.Color(row.color).multiplyScalar(row.emissive?1.08:.82+Math.max(0,normal.dot(light))*.24);out.push({points,color:'#'+color.getHexString(THREE.SRGBColorSpace),depth:points.reduce((s,p)=>s+p.depth,0)/3});
  }
 }
 return out.sort((a,b)=>a.depth-b.depth);
}
export function cityPreviewFrame(faces,width=480,height=360){
 const points=faces.flatMap(f=>f.points);
 if(!points.length)return {scale:1,centerX:0,minY:0,offsetY:height/2};
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const padding=Math.min(width,height)*.065,scale=Math.min((width-padding*2)/(maxX-minX||1),(height-padding*2)/(maxY-minY||1));
 return {scale,centerX:(minX+maxX)/2,minY,offsetY:(height-(maxY-minY)*scale)/2};
}
const cache=new Map();
export function cityModelThumbnail(definition,footprint,seed){
 const key=JSON.stringify([definition.code,seed,definition.category,definition.metadata?.architecture,footprint||definition.footprint]);if(cache.has(key))return cache.get(key);
 const width=480,height=360,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)return '';
 const faces=cityPreviewTriangles(definition,footprint,seed),frame=cityPreviewFrame(faces,width,height),{scale,centerX,minY,offsetY}=frame;
 const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,cityPreviewArt.skyTop);sky.addColorStop(.65,cityPreviewArt.skyMiddle);sky.addColorStop(1,cityPreviewArt.skyBottom);ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 ctx.fillStyle=cityPreviewArt.contactShadow;ctx.beginPath();ctx.ellipse(width/2,height*.92,width*.30,height*.035,0,0,Math.PI*2);ctx.fill();
 const pixels=ctx.getImageData(0,0,width,height),depth=new Float32Array(width*height).fill(-Infinity);
 const edge=(a,b,x,y)=>(x-a.x)*(b.y-a.y)-(y-a.y)*(b.x-a.x);
 for(const face of faces){
  const p=face.points.map(p=>({x:width/2+(p.x-centerX)*scale,y:offsetY+(p.y-minY)*scale,depth:p.depth})),area=edge(p[0],p[1],p[2].x,p[2].y);if(Math.abs(area)<.00001)continue;
  const minx=Math.max(0,Math.floor(Math.min(...p.map(v=>v.x)))),maxx=Math.min(width-1,Math.ceil(Math.max(...p.map(v=>v.x)))),miny=Math.max(0,Math.floor(Math.min(...p.map(v=>v.y)))),maxy=Math.min(height-1,Math.ceil(Math.max(...p.map(v=>v.y))));
  const color=parseInt(face.color.slice(1),16),rgb=[color>>16,(color>>8)&255,color&255];
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
   const a=edge(p[1],p[2],x+.5,y+.5)/area,b=edge(p[2],p[0],x+.5,y+.5)/area,c=1-a-b;if(a<-.0001||b<-.0001||c<-.0001)continue;
   const z=a*p[0].depth+b*p[1].depth+c*p[2].depth,index=y*width+x;if(z<depth[index])continue;depth[index]=z;pixels.data[index*4]=rgb[0];pixels.data[index*4+1]=rgb[1];pixels.data[index*4+2]=rgb[2];
  }
 }
 ctx.putImageData(pixels,0,0);
 const src=canvas.toDataURL('image/png');if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,src);return src;
}
