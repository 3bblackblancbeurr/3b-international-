import * as THREE from 'three';
import {surfaceTexture} from './surfaces.js';

export const GROUND_STYLE={
 hub:{dry:.08,soil:'#8e815c',grass:'#7d9e58',count:19000},france:{dry:.1,soil:'#9f8b63',grass:'#7b9954',count:18000},
 italie:{dry:.38,soil:'#b19b70',grass:'#9da567',count:11000},estonie:{dry:.03,soil:'#877e62',grass:'#709577',count:15500},
 turquie:{dry:.67,soil:'#b9a181',grass:'#a0a378',count:6000},algerie:{dry:.8,soil:'#cbb080',grass:'#a5ae76',count:4600},
 tunisie:{dry:.43,soil:'#c2b48b',grass:'#a6b185',count:7500},maroc:{dry:.73,soil:'#b69770',grass:'#a5a57a',count:5100},
 espagne:{dry:.48,soil:'#bda077',grass:'#a6aa71',count:8000},
};

// Mix broad patches in world space with fine surface grain. No visible grid of
// repeated grass photos, and the ground remains readable beyond the 3D meadow.
export function createNaturalGround(region){
 const style=GROUND_STYLE[region]||GROUND_STYLE.hub,texture=surfaceTexture('grass');
 if(texture)texture.repeat.set(260,260);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,map:texture,bumpMap:texture,bumpScale:.055,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.soilTint={value:new THREE.Color(style.soil)};shader.uniforms.groundDryness={value:style.dry};
  shader.vertexShader='varying vec2 naturalXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nnaturalXZ=(modelMatrix*vec4(position,1.)).xz;');
  shader.fragmentShader=`varying vec2 naturalXZ;uniform vec3 soilTint;uniform float groundDryness;
   float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),mix(landHash(i+vec2(0,1)),landHash(i+vec2(1,1)),f.x),f.y);}
   `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float patches=landNoise(naturalXZ*.075)*.65+landNoise(naturalXZ*.23)*.35;
    float wear=smoothstep(.48-groundDryness*.22,.78-groundDryness*.18,patches);
    float grain=landNoise(naturalXZ*5.7)*.12+landNoise(naturalXZ*1.9)*.08+.84;
    diffuseColor.rgb=mix(diffuseColor.rgb,soilTint*.82,wear*(.14+groundDryness*.6))*grain;
   `);
 };
 material.customProgramCacheKey=()=> '3b-ground-patches-1';
 return {material,texture};
}
