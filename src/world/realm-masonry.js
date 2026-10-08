import * as THREE from 'three';

// Four bounded surfaces share one PBR atlas and one draw material. Texels are
// authored locally: no network, canvas, lighting baked into colour or sparkle.
export const REALM_MASONRY_SIZE=512;
export const REALM_MASONRY_SURFACES=Object.freeze({stone:0,plaster:1,paving:2,grain:3});
const seedFor=value=>[...value].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),41)>>>0;
const hash=(x,y,seed)=>{let n=Math.imul(x+seed,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y,seed){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return(1-v)*((1-u)*hash(a,b,seed)+u*hash(a+1,b,seed))+v*((1-u)*hash(a,b+1,seed)+u*hash(a+1,b+1,seed));}
const byte=value=>Math.max(0,Math.min(255,Math.round(value)));

export function createRealmMasonryTextures(region){
 const size=REALM_MASONRY_SIZE,tile=size/2,seed=seedFor(region),colour=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),height=new Float32Array(size*size);
 const cool=['france','estonie'].includes(region),earth=['maroc','algerie','turquie'].includes(region);
 for(let surface=0;surface<4;surface++)for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
  const ax=x+(surface%2)*tile,ay=y+Math.floor(surface/2)*tile,index=ay*size+ax,p=index*4,u=x/tile,v=y/tile;
  const cloud=noise(u*6,v*6,seed+surface*73),wear=noise(u*17,v*17,seed+51),fine=(hash(x,y,seed)-.5)*1.1;
  let value=231+(cloud-.5)*10+fine,bump=.5+(wear-.5)*.007,r=.9;
  if(surface===0||surface===2){
   const rows=surface===0?4:5,row=Math.floor(v*rows),shift=surface===0?(row%2)*.5:(row%2)*.28,columns=surface===0?2:4;
   const xx=u*columns+shift,yy=v*rows,fx=xx-Math.floor(xx),fy=yy-Math.floor(yy),edge=Math.min(fx,1-fx,fy,1-fy),joint=1-smooth(Math.min(1,edge/(surface===0?.026:.038)));
   const slab=hash(Math.floor(xx),row,seed+surface*27),mottle=(cloud-.5)*11+(wear-.5)*4;
   value=(surface===0?218:183)+(slab-.5)*(surface===0?32:58)+mottle-joint*(surface===0?66:67);
   bump=.5+(slab-.5)*.009+(wear-.5)*.005-joint*.16;r=(surface===0?.88:.86)+joint*.1+(cloud-.5)*.04;
  }else if(surface===1){
   // Broad lime-render clouds and restrained pores retain a calm façade.
   value=236+(cloud-.5)*13+(wear-.5)*5+fine;bump=.5+(wear-.5)*.014;r=.93+(cloud-.5)*.035;
  }else{
   const plank=Math.floor(u*5),edge=Math.min(u*5-plank,1-(u*5-plank)),joint=1-smooth(Math.min(1,edge/.03));
   const fibre=noise(u*42,v*3,seed+19),grain=Math.sin(u*125+cloud*8)*.5+.5;
   value=222+(hash(plank,0,seed)-.5)*16+(fibre-.5)*14+(grain-.5)*3-joint*41;
   bump=.5+(fibre-.5)*.014-joint*.10;r=.82+(fibre-.5)*.06;
  }
  const tint=surface===3?[1,1,1]:cool?[.985,1,1.012]:earth?[1.015,1,.975]:[1.012,1,.987];
  colour[p]=byte(value*tint[0]);colour[p+1]=byte(value*tint[1]);colour[p+2]=byte(value*tint[2]);colour[p+3]=255;
  height[index]=bump;rough[p]=rough[p+1]=rough[p+2]=byte(r*255);rough[p+3]=255;
 }
 for(let surface=0;surface<4;surface++)for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
  const ox=(surface%2)*tile,oy=Math.floor(surface/2)*tile,index=(oy+y)*size+ox+x,p=index*4;
  const sample=(dx,dy)=>height[(oy+(y+dy+tile)%tile)*size+ox+(x+dx+tile)%tile],dx=(sample(1,0)-sample(-1,0))*2.3,dy=(sample(0,1)-sample(0,-1))*2.3,length=Math.hypot(dx,dy,1);
  normal[p]=byte((-.5*dx/length+.5)*255);normal[p+1]=byte((-.5*dy/length+.5)*255);normal[p+2]=byte((.5/length+.5)*255);normal[p+3]=255;
 }
 function texture(data,name,colourSpace=THREE.NoColorSpace){const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.name='3B '+region+' '+name;map.colorSpace=colourSpace;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=4;map.needsUpdate=true;return map;}
 const map=texture(colour,'masonry colour',THREE.SRGBColorSpace),normalMap=texture(normal,'masonry normal'),roughnessMap=texture(rough,'masonry roughness');
 let disposed=false;return{map,normalMap,roughnessMap,diagnostics:{size,surfaces:4,textures:3,bytes:colour.byteLength+normal.byteLength+rough.byteLength,mipmapped:true},dispose(){if(disposed)return;disposed=true;map.dispose();normalMap.dispose();roughnessMap.dispose();}};
}

export function installRealmMasonryAtlas(material){
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float realmSurface; varying float vRealmSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRealmSurface=realmSurface;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying float vRealmSurface;
vec2 realmAtlasUv(vec2 p){float s=floor(vRealmSurface+.5);return (vec2(mod(s,2.),floor(s*.5))+vec2(.025)+fract(p)*.95)*.5;}
vec4 realmAtlasSample(sampler2D atlas,vec2 p){return textureGrad(atlas,realmAtlasUv(p),dFdx(p)*.475,dFdy(p)*.475);}
`);
  for(const [chunk,sampler,varying]of[['map_fragment','map','vMapUv'],['normal_fragment_maps','normalMap','vNormalMapUv'],['roughnessmap_fragment','roughnessMap','vRoughnessMapUv']]){
   const source=THREE.ShaderChunk[chunk].replaceAll(`texture2D( ${sampler}, ${varying} )`,`realmAtlasSample(${sampler},${varying})`);shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',source);
  }
 };
 material.customProgramCacheKey=()=> '3B-realm-masonry-atlas-v1';
}

// A metric projection per triangle avoids stretched generic primitive UVs and
// keeps the same surface density across a scaled façade, column or paving slab.
export function realmMasonryUv(geometry,surface=0,metresPerTile=surface===2?4:2){
 const p=geometry.attributes.position,uv=new Float32Array(p.count*2),kind=new Float32Array(p.count);
 for(let i=0;i<p.count;i+=3){
  const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i),bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i),nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,axis=Math.abs(ny)>=Math.max(Math.abs(nx),Math.abs(nz))?'y':Math.abs(nx)>Math.abs(nz)?'x':'z';
  for(let k=i;k<i+3;k++){const u=axis==='x'?-p.getZ(k)*Math.sign(nx||1):p.getX(k)*(axis==='z'?Math.sign(nz||1):1),v=axis==='y'?-p.getZ(k)*Math.sign(ny||1):p.getY(k);uv[k*2]=u/metresPerTile;uv[k*2+1]=v/metresPerTile;kind[k]=surface;}
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setAttribute('realmSurface',new THREE.BufferAttribute(kind,1));return geometry;
}
