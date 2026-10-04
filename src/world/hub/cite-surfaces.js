import * as THREE from 'three';
import {applyFacadeDetail} from '../facade-detail.js';

/** Shared PBR resources for the hub, with physical-scale paving and cliff strata. */
export function createCiteSurfaces(owned){
 const day={value:1},wet={value:0},textures={},loads=[],loader=typeof document!=='undefined'?new THREE.TextureLoader():null;
 function texture(name,path,color=false){
  if(!loader)return null;let done;loads.push(new Promise(resolve=>{done=resolve;}));
  const t=loader.load(path,()=>done(),undefined,()=>{const fallback=document.createElement('canvas');fallback.width=fallback.height=1;const ctx=fallback.getContext('2d');ctx.fillStyle=name==='normal'?'#8080ff':'#a0a0a0';ctx.fillRect(0,0,1,1);t.image=fallback;t.needsUpdate=true;done();});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;owned.push(t);textures[name]=t;return t;
 }

 const paving=texture('paving','/world/paris/textures/cobblestone_floor_08_Diffuse.jpg',true),normal=texture('normal','/world/paris/textures/cobblestone_floor_08_nor_gl.jpg'),rough=texture('rough','/world/paris/textures/cobblestone_floor_08_Rough.jpg');
 const dark=new THREE.MeshPhysicalMaterial({color:'#101d2b',roughness:.37,metalness:.58,clearcoat:.35,clearcoatRoughness:.3});
 applyFacadeDetail(dark,{daylight:day,crafted:true});
 const gold=new THREE.MeshPhysicalMaterial({color:'#cba364',roughness:.25,metalness:.92,clearcoat:.24});
 const glass=new THREE.MeshPhysicalMaterial({color:'#173c52',roughness:.12,metalness:.4,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.4});
 const stone=new THREE.MeshStandardMaterial({color:'#8c989b',roughness:.85,metalness:.03,map:paving,normalMap:normal,normalScale:new THREE.Vector2(.55,.55),roughnessMap:rough});
 const cliff=new THREE.MeshStandardMaterial({color:'#43515a',roughness:.94,metalness:.04});
 const deck=new THREE.MeshStandardMaterial({color:'#758b85',roughness:.88,metalness:.02,map:paving,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),roughnessMap:rough});
 function surfaceShader(m,kind){m.onBeforeCompile=shader=>{
  shader.uniforms.citeDay=day;shader.uniforms.citeWet=wet;
  shader.vertexShader='varying vec3 citeP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nciteP=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='varying vec3 citeP;uniform float citeDay;uniform float citeWet;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(citeP.xz*7.),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb*=.94+.06*grain;
   ${kind==='cliff'?`float strata=.88+.12*sin(citeP.y*1.1+sin(citeP.x*.21)*.6+sin(citeP.z*.19)*.5);
    vec2 cell=floor(citeP.xz*.65+sin(citeP.y*.18));float rock=fract(sin(dot(cell,vec2(41.17,289.13)))*43758.5453);
    float seams=smoothstep(.02,.16,abs(sin(citeP.y*.78+rock*.65)));
    diffuseColor.rgb*=strata*(.76+.3*rock)*mix(.62,1.,seams);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.13,.09),smoothstep(-7.,-.3,citeP.y)*smoothstep(.7,.92,rock)*.38);` : ''}
   ${kind==='deck'?`vec2 p=citeP.xz/1.7;float r=length(p);float lane=abs(r-125.);for(int i=0;i<8;i++){float a=float(i)*.785398163;lane=min(lane,abs(dot(p,vec2(-sin(a),cos(a)))));}float garden=smoothstep(8.,12.,lane)*smoothstep(48.,62.,r);vec3 turf=vec3(.035,.16,.085)*(.85+.3*grain);diffuseColor.rgb=mix(diffuseColor.rgb,turf,garden*.85);` : ''}
   diffuseColor.rgb*=1.-citeWet*.12;
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.3,citeWet*.7);');
 };m.customProgramCacheKey=()=> '3b-cite-pbr-'+kind+'-v2';}
 surfaceShader(stone,'stone');surfaceShader(deck,'deck');surfaceShader(cliff,'cliff');
 for(const m of [dark,gold,glass,stone,cliff,deck])owned.push(m);
 return{dark,gold,glass,stone,cliff,deck,ready:Promise.all(loads),setDaylight(value){day.value=value;},setWeather(value){wet.value=value==='rain'?.8:value==='storm'?1:0;},setQuality(mode){for(const t of Object.values(textures))t.anisotropy=mode==='fluid'?2:4;}};
}
