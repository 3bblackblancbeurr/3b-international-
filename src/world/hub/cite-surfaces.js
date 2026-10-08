import * as THREE from 'three';
import {applyFacadeDetail} from '../facade-detail.js';
import {advanceWetness,wetnessForWeather} from '../wetness.js';

/** Shared PBR resources for the hub, with physical-scale paving and cliff strata. */
export function createCiteSurfaces(owned){
 const day={value:1},wet={value:.06},textures={},loads=[],loader=typeof document!=='undefined'?new THREE.TextureLoader():null;let wetTarget=.06,lastTime=null;
 function texture(name,path,color=false){
  if(!loader)return null;let done;loads.push(new Promise(resolve=>{done=resolve;}));
  const t=loader.load(path,()=>done(),undefined,()=>{const fallback=document.createElement('canvas');fallback.width=fallback.height=1;const ctx=fallback.getContext('2d');ctx.fillStyle=name==='normal'?'#8080ff':'#a0a0a0';ctx.fillRect(0,0,1,1);t.image=fallback;t.needsUpdate=true;done();});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;owned.push(t);textures[name]=t;return t;
 }

 const paving=texture('paving','/world/paris/textures/cobblestone_floor_08_Diffuse.jpg',true),normal=texture('normal','/world/paris/textures/cobblestone_floor_08_nor_gl.jpg'),rough=texture('rough','/world/paris/textures/cobblestone_floor_08_Rough.jpg');
 const dark=new THREE.MeshPhysicalMaterial({color:'#101d2b',roughness:.37,metalness:.58,clearcoat:.35,clearcoatRoughness:.3});
 applyFacadeDetail(dark,{daylight:day,crafted:true});
 const gold=new THREE.MeshPhysicalMaterial({color:'#cba364',roughness:.25,metalness:.92,clearcoat:.24});
 const glass=new THREE.MeshPhysicalMaterial({color:'#173c52',roughness:.2,metalness:.18,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.4});
 const stone=new THREE.MeshStandardMaterial({color:'#8c989b',roughness:.85,metalness:.03,map:paving,normalMap:normal,normalScale:new THREE.Vector2(.55,.55),roughnessMap:rough});
 const cliff=new THREE.MeshStandardMaterial({color:'#43515a',roughness:.94,metalness:.04});
 const deck=new THREE.MeshStandardMaterial({color:'#8b929a',roughness:.88,metalness:.02,map:paving,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),roughnessMap:rough,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 function surfaceShader(m,kind){m.onBeforeCompile=shader=>{
  shader.uniforms.citeDay=day;shader.uniforms.citeWet=wet;
  shader.vertexShader='varying vec3 citeP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 citeLocal=vec4(position,1.);\n#ifdef USE_INSTANCING\nciteLocal=instanceMatrix*citeLocal;\n#endif\nciteP=(modelMatrix*citeLocal).xyz;');
  shader.fragmentShader='varying vec3 citeP;uniform float citeDay;uniform float citeWet;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(citeP.xz*7.),vec2(12.9898,78.233)))*43758.5453);
   float grainPixel=max(fwidth(citeP.x*7.),fwidth(citeP.z*7.));
   float grainDetail=1.-smoothstep(.35,1.1,grainPixel);
   diffuseColor.rgb*=.97+(.06*grain-.03)*grainDetail;
   ${kind==='cliff'?`float strata=.88+.12*sin(citeP.y*1.1+sin(citeP.x*.21)*.6+sin(citeP.z*.19)*.5);
    vec2 cell=floor(citeP.xz*.65+sin(citeP.y*.18));float rock=fract(sin(dot(cell,vec2(41.17,289.13)))*43758.5453);
    float rockDetail=1.-smoothstep(.35,1.1,max(fwidth(citeP.x*.65),fwidth(citeP.z*.65)));
    float seams=smoothstep(.02,.16+fwidth(citeP.y*.78),abs(sin(citeP.y*.78+rock*.65)));
    diffuseColor.rgb*=strata*(.91+(.3*rock-.15)*rockDetail)*mix(.81,mix(.62,1.,seams),rockDetail);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.13,.09),smoothstep(-7.,-.3,citeP.y)*smoothstep(.7,.92,rock)*.38);` : ''}
   ${kind==='deck'?`// Physical paving stays stone. Planted beds have their own geometry.
    vec2 p=citeP.xz/1.7;float r=length(p);float ringLane=abs(r-125.);
    float promenade=1.-smoothstep(3.,6.,ringLane);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.63,.76,.89),promenade*.35);
    // Long recessed drainage channels border the real ring, without painting
    // grass over cobbles or adding an unrelated road pattern.
    float drainAA=max(.001,fwidth(r));float drain=(1.-smoothstep(.045-drainAA,.10+drainAA,abs(ringLane-5.3)))*step(100.,r);
    diffuseColor.rgb*=1.-drain*.4;` : ''}
   float wetCell=sin(citeP.x*.37+sin(citeP.z*.21))*sin(citeP.z*.42+sin(citeP.x*.17));
   float puddle=smoothstep(.58,.91,wetCell)*citeWet;
   diffuseColor.rgb*=1.-citeWet*.09-puddle*.16;
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float poolNoise=sin(citeP.x*.37+sin(citeP.z*.21))*sin(citeP.z*.42+sin(citeP.x*.17));
   float poolMask=smoothstep(.58,.91,poolNoise)*citeWet;
   roughnessFactor=mix(roughnessFactor,.16,poolMask*.85);
   roughnessFactor=mix(roughnessFactor,.48,citeWet*.2);`);
 };m.customProgramCacheKey=()=> '3b-cite-pbr-'+kind+'-v4';}
 surfaceShader(stone,'stone');surfaceShader(deck,'deck');surfaceShader(cliff,'cliff');
 for(const m of [dark,gold,glass,stone,cliff,deck])owned.push(m);
 return{dark,gold,glass,stone,cliff,deck,ready:Promise.all(loads),setDaylight(value){day.value=value;},setWeather(value){wetTarget=wetnessForWeather(value);},tick(time){if(lastTime!==null)wet.value=advanceWetness(wet.value,wetTarget,time-lastTime);lastTime=time;},get wetness(){return wet.value;},setQuality(mode){for(const t of Object.values(textures))t.anisotropy=mode==='fluid'?2:4;}};
}
