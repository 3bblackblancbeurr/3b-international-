import {ShaderChunk} from 'three';

const fabrics={cotton:.84,linen:.93,satin:.68,leather:.56};
const surfaces={
 skin:{roughness:.6,frequency:320,depth:.000025,variation:.015,normal:.6},
 hair:{roughness:.64,frequency:240,depth:.000035,variation:.025,normal:.8},
 leather:{roughness:.56,frequency:225,depth:.00005,variation:.045,normal:.8},
 cloth:{roughness:.84,frequency:320,depth:.00004,variation:.025,normal:.75},
 metal:{roughness:.39,frequency:180,depth:.000015,variation:.025,normal:.7},
};

export function characterMaterialSurface(name=''){
 return /SkinColor|HandsColor/.test(name)?'skin':/EyeColor/.test(name)?'eyes':/HairColor/.test(name)?'hair':/BootColor/.test(name)?'leather':/TrimColor/.test(name)?'metal':'cloth';
}

// The detail is evaluated in the existing UVs: no extra textures, meshes or
// vertex deformation. Pixel derivatives fade the weave before it can shimmer.
const surfaceNormal=`
vec3 normal3bSurface(vec3 p, vec3 n, vec2 slope) {
 vec3 px=dFdx(p), py=dFdy(p);
 vec3 rx=cross(py,n), ry=cross(n,px);
 float determinant=dot(px,rx);
 if(abs(determinant)<1e-10)return n;
 vec2 du=dFdx(v3bSurfaceUv), dv=dFdy(v3bSurfaceUv);
 return normalize(abs(determinant)*n-sign(determinant)*(dot(slope,du)*rx+dot(slope,dv)*ry));
}`;

/** Configure owned material instances, preserving the source albedo/normal
 * textures. The imported ORM sheet is shared by skin, gloves and clothing;
 * its black roughness texels produced a varnished face and plastic uniforms. */
export function prepareTintMaterial(material,{pattern=false,surface=characterMaterialSurface(material.name),fabric='cotton',tint=true}={}){
 if(surface==='eyes'){
  material.metalness=0;material.metalnessMap=null;material.roughnessMap=null;
  material.roughness=.18;material.normalScale?.setScalar(.45);material.envMapIntensity=1.1;
  material.userData.surface3b='eyes';material.needsUpdate=true;return material;
 }
 const profile=surfaces[surface]||surfaces.cloth;
 material.metalness=surface==='metal'?.82:0;material.metalnessMap=null;material.roughnessMap=null;
 material.roughness=surface==='cloth'?(fabrics[fabric]??fabrics.cotton):profile.roughness;
 material.normalScale?.setScalar(profile.normal);
 material.userData.surface3b=surface;
 const shadePower=surface==='skin'?.58:surface==='hair'?.62:.42;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 v3bSurfaceUv;')
   .replace('#include <uv_vertex>','#include <uv_vertex>\nv3bSurfaceUv=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec2 v3bSurfaceUv;\n${surfaceNormal}`);
  if(material.map&&!pattern&&tint){
   const map=ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',
    `float shade3b=pow(max(dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722)),0.001),${shadePower}); diffuseColor*=vec4(vec3(shade3b),sampledDiffuseColor.a);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',map);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   vec2 phase3b=v3bSurfaceUv*${(profile.frequency*Math.PI*2).toFixed(5)};
   float coverage3b=1.0-smoothstep(0.8,3.14,max(fwidth(phase3b.x),fwidth(phase3b.y)));
   float grain3b=sin(phase3b.x)*sin(phase3b.y);
   roughnessFactor=clamp(roughnessFactor+grain3b*coverage3b*${profile.variation},0.18,1.0);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 slope3b=vec2(cos(phase3b.x)*sin(phase3b.y),sin(phase3b.x)*cos(phase3b.y))*${(profile.depth*profile.frequency*Math.PI*2).toFixed(7)}*coverage3b;
   normal=normal3bSurface(-vViewPosition,normal,slope3b);`);
 };
 material.customProgramCacheKey=()=>`3b-surface-v2:${surface}:${fabric}:${pattern?'pattern':tint?'tint':'albedo'}`;
 material.needsUpdate=true;
 return material;
}
