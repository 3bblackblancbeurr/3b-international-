import * as THREE from 'three';

// A small HDR sky, prefiltered once on arrival, gives metal, water and cloth a
// shared lighting environment without an extra full-screen rendering pass.
export function createDaylight(renderer,biome){
 const width=128,height=64,data=new Float32Array(width*height*4),sky=new THREE.Color(biome.sky),horizon=new THREE.Color(biome.haze),earth=new THREE.Color(biome.low),color=new THREE.Color();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const up=Math.cos((y+.5)/height*Math.PI),angle=(x+.5)/width*Math.PI*2;
  if(up>=0){
   color.copy(horizon).lerp(sky,Math.pow(up,.50)).multiplyScalar(1.18);
   const zenith=Math.pow(Math.max(0,up),2.2);color.r*=1-.04*zenith;color.g*=1-.015*zenith;color.b*=1+.08*zenith;
  }else color.copy(horizon).lerp(earth,Math.pow(-up,.38)).multiplyScalar(.48);
  const glow=Math.pow(Math.max(0,Math.cos(angle-2.35)),28)*Math.exp(-Math.pow((up-.65)*8.5,2));
  const halo=Math.pow(Math.max(0,Math.cos(angle-2.35)),6)*Math.exp(-Math.pow((up-.62)*3.5,2));
  color.r+=glow*3.25+halo*.16;color.g+=glow*2.72+halo*.11;color.b+=glow*1.72+halo*.045;
  const i=(y*width+x)*4;data[i]=color.r;data[i+1]=color.g;data[i+2]=color.b;data[i+3]=1;
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),result=generator.fromEquirectangular(source);source.dispose();generator.dispose();return result;
}
