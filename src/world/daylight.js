import * as THREE from 'three';

export function daylightResolution(memory=4,cores=4){
 const m=Number(memory)||4,c=Number(cores)||4;
 if(m<=3||c<=4)return{width:64,height:32};
 if(m>=8&&c>=8)return{width:256,height:128};
 return{width:128,height:64};
}

// A compact HDR sky, prefiltered once on arrival, gives metal, water and cloth a
// shared lighting environment without an extra full-screen rendering pass. The
// source precision follows the phone: weak devices spend less startup/GPU memory,
// powerful devices get cleaner reflections without heavier scene geometry.
export function createDaylight(renderer,biome){
 const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory)||4:4,cores=typeof navigator!=='undefined'?Number(navigator.hardwareConcurrency)||4:4;
 const {width,height}=daylightResolution(memory,cores),data=new Float32Array(width*height*4),sky=new THREE.Color(biome.sky),horizon=new THREE.Color(biome.haze),earth=new THREE.Color(biome.low),color=new THREE.Color();
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
