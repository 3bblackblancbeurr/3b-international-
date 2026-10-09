import * as THREE from 'three';
import {surfaceMaterialMaps} from './surfaces.js';
import {wetnessForWeather} from './wetness.js';
import {worldRealmArt} from '../design-system/tokens.js';

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
  rockTint:{value:new THREE.Color((worldRealmArt[region]||worldRealmArt.hub).stone).lerp(new THREE.Color((worldRealmArt[region]||worldRealmArt.hub).ground),.28)},
  groundDryness:{value:style.dry},
  surfaceWetness:{value:0},
  daylight:{value:1},
  detailStrength:{value:1},
 };
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 naturalPosition;varying vec3 naturalNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nnaturalPosition=(modelMatrix*vec4(position,1.)).xyz;naturalNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=`varying vec3 naturalPosition;varying vec3 naturalNormal;uniform vec3 soilTint;uniform vec3 rockTint;uniform float groundDryness;uniform float surfaceWetness;uniform float daylight;uniform float detailStrength;
   float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),mix(landHash(i+vec2(0,1)),landHash(i+vec2(1,1)),f.x),f.y);}
   `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 naturalXZ=naturalPosition.xz;
    // Macro patches follow the land across sector borders; smaller grain is
    // attenuated at distance to keep moving mobile cameras free of sparkle.
    float broad=landNoise(naturalXZ*.008),mid=landNoise(naturalXZ*.052),fine=landNoise(naturalXZ*.32);
    float patches=broad*.55+mid*.32+fine*.13;
    float slope=1.-abs(normalize(naturalNormal).y);
    float rockMask=smoothstep(.075,.32,slope+(.5-broad)*.065);
    float wear=smoothstep(.46-groundDryness*.21,.75-groundDryness*.16,patches);
    float detailFade=detailStrength*(1.-smoothstep(45.,150.,length(cameraPosition-naturalPosition)));
    float grain=.91+fine*.07+(landNoise(naturalXZ*2.7)-.5)*.07*detailFade;
    float crackField=abs(mid-.5);
    float cracks=(1.-smoothstep(.008,.024,crackField))*groundDryness*detailFade;
    float mineral=landNoise(naturalPosition.xz*.11+naturalPosition.y*.045);
    float strata=.5+.5*sin(naturalPosition.y*.37+mineral*5.);
    float lowPatch=smoothstep(.60,.82,mid)*(1.-smoothstep(.045,.20,slope));
    float wetMask=surfaceWetness*(.24+.76*lowPatch)*(1.-rockMask*.65);
    vec3 dryColor=mix(diffuseColor.rgb,soilTint*(.77+fine*.13),wear*(.22+groundDryness*.58));
    dryColor*=grain*(.91+broad*.16);
    vec3 mineralColor=rockTint*(.72+mineral*.20+strata*.055);
    dryColor=mix(dryColor,mineralColor,rockMask*.87);
    dryColor*=1.-cracks*.085;
    vec3 wetColor=dryColor*mix(.78,.63,lowPatch);
    wetColor=mix(wetColor,wetColor+vec3(.015,.028,.036),.28*(1.-daylight));
    diffuseColor.rgb=mix(dryColor,wetColor,wetMask);
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(roughnessFactor,.86,rockMask*.65);
    roughnessFactor=mix(roughnessFactor,.38,wetMask);
   `);
 };
 material.customProgramCacheKey=()=> '3b-ground-master-5';
 function setWetness(value){uniforms.surfaceWetness.value=Math.max(0,Math.min(1,Number(value)||0));}
 function setWeather(weather){setWetness(wetnessForWeather(weather));}
 function setDaylight(value){uniforms.daylight.value=Math.max(0,Math.min(1,Number(value)||0));}
 function setQuality(mode){uniforms.detailStrength.value=mode==='fluid'?.45:mode==='detail'?1.15:.82;material.bumpScale=mode==='fluid'?.012:mode==='detail'?.032:.024;}
 return {material,texture,maps,setWetness,setWeather,setDaylight,setQuality};
}
