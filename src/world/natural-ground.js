import * as THREE from 'three';
import {surfaceMaterialMaps} from './surfaces.js';
import {wetnessForWeather} from './wetness.js';

export const GROUND_STYLE={
 hub:{dry:.08,soil:'#5e5a48',grass:'#667e4b',count:19000},france:{dry:.1,soil:'#8d7a5b',grass:'#6d8c50',count:18000},
 italie:{dry:.38,soil:'#a48c65',grass:'#8f985f',count:11000},estonie:{dry:.03,soil:'#746d59',grass:'#62866a',count:15500},
 turquie:{dry:.67,soil:'#aa9479',grass:'#94986e',count:6000},algerie:{dry:.8,soil:'#b89f73',grass:'#969f68',count:4600},
 tunisie:{dry:.43,soil:'#b0a57d',grass:'#98a77b',count:7500},maroc:{dry:.73,soil:'#a38762',grass:'#95956e',count:5100},
 espagne:{dry:.48,soil:'#aa8d6a',grass:'#999e67',count:8000},
};

export function createNaturalGround(region){
 const style=GROUND_STYLE[region]||GROUND_STYLE.hub,maps=surfaceMaterialMaps('grass'),texture=maps.map;
 for(const t of Object.values(maps))if(t)t.repeat.set(260,260);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,map:maps.map,bumpMap:maps.bumpMap,roughnessMap:maps.roughnessMap,bumpScale:.026,roughness:1,metalness:0});
 const uniforms={
  soilTint:{value:new THREE.Color(style.soil)},
  groundDryness:{value:style.dry},
  surfaceWetness:{value:0},
  daylight:{value:1},
  detailStrength:{value:1},
 };
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec2 naturalXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nnaturalXZ=(modelMatrix*vec4(position,1.)).xz;');
  shader.fragmentShader=`varying vec2 naturalXZ;uniform vec3 soilTint;uniform float groundDryness;uniform float surfaceWetness;uniform float daylight;uniform float detailStrength;
   float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),mix(landHash(i+vec2(0,1)),landHash(i+vec2(1,1)),f.x),f.y);}
   `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float broad=landNoise(naturalXZ*.038),mid=landNoise(naturalXZ*.19),fine=landNoise(naturalXZ*1.8);
    float patches=broad*.56+mid*.31+fine*.13;
    float wear=smoothstep(.50-groundDryness*.24,.80-groundDryness*.17,patches);
    float grain=.86+landNoise(naturalXZ*7.9)*.10+landNoise(naturalXZ*2.7)*.06;
    float crackField=abs(landNoise(naturalXZ*.31)-.5);
    float cracks=(1.-smoothstep(.012,.038,crackField))*detailStrength;
    float seamX=1.-smoothstep(.025,.07,abs(fract(naturalXZ.x*.118)-.5));
    float seamZ=1.-smoothstep(.025,.07,abs(fract(naturalXZ.y*.118)-.5));
    float urbanJoint=max(seamX,seamZ)*(1.-groundDryness)*.13*detailStrength;
    float lowPatch=smoothstep(.66,.86,landNoise(naturalXZ*.085+13.2));
    float wetMask=surfaceWetness*(.32+.68*lowPatch);
    vec3 dryColor=mix(diffuseColor.rgb,soilTint*.78,wear*(.16+groundDryness*.62));
    dryColor*=grain;
    dryColor*=1.-cracks*.12-urbanJoint*.06;
    vec3 wetColor=dryColor*mix(.78,.63,lowPatch);
    wetColor=mix(wetColor,wetColor+vec3(.015,.028,.036),.28*(1.-daylight));
    diffuseColor.rgb=mix(dryColor,wetColor,wetMask);
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float wetRough=surfaceWetness*(.22+.78*smoothstep(.62,.86,landNoise(naturalXZ*.085+13.2)));
    roughnessFactor=mix(roughnessFactor,.34,wetRough);
   `);
 };
 material.customProgramCacheKey=()=> '3b-ground-premium-4';
 function setWetness(value){uniforms.surfaceWetness.value=Math.max(0,Math.min(1,Number(value)||0));}
 function setWeather(weather){setWetness(wetnessForWeather(weather));}
 function setDaylight(value){uniforms.daylight.value=Math.max(0,Math.min(1,Number(value)||0));}
 function setQuality(mode){uniforms.detailStrength.value=mode==='fluid'?.45:mode==='detail'?1.15:.82;material.bumpScale=mode==='fluid'?.012:mode==='detail'?.032:.024;material.needsUpdate=true;}
 return {material,texture,maps,setWetness,setWeather,setDaylight,setQuality};
}
