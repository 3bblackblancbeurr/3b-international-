import * as THREE from 'three';

// A small HDR sky, prefiltered once on arrival, gives metal, water and cloth a
// shared lighting environment without an extra full-screen rendering pass.
export function createDaylight(renderer,biome){
 const width=128,height=64,data=new Float32Array(width*height*4),sky=new THREE.Color(biome.sky),horizon=new THREE.Color(biome.haze),earth=new THREE.Color(biome.low),color=new THREE.Color();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const up=Math.cos((y+.5)/height*Math.PI),angle=(x+.5)/width*Math.PI*2;
  if(up>=0)color.copy(horizon).lerp(sky,Math.pow(up,.45)).multiplyScalar(1.15);
  else color.copy(horizon).lerp(earth,Math.pow(-up,.35)).multiplyScalar(.55);
  const glow=Math.pow(Math.max(0,Math.cos(angle-2.35)),24)*Math.exp(-Math.pow((up-.65)*8,2));
  color.r+=glow*3;color.g+=glow*2.6;color.b+=glow*1.8;
  const i=(y*width+x)*4;data[i]=color.r;data[i+1]=color.g;data[i+2]=color.b;data[i+3]=1;
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),result=generator.fromEquirectangular(source);source.dispose();generator.dispose();return result;
}
