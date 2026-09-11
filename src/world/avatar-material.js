import {ShaderChunk} from 'three';

// Keep the imported fabric/skin detail, but remove its baked color before applying
// the player's palette. Multiplying two colored albedos made custom outfits dark.
export function prepareTintMaterial(material,{pattern=false}={}){
 material.metalness=0;material.metalnessMap=null;material.roughness=.86;
 if(material.map&&!pattern){
  material.onBeforeCompile=shader=>{
   const map=ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',
    'float shade3b = pow(max(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.001), 0.35); diffuseColor *= vec4(vec3(shade3b), sampledDiffuseColor.a);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',map);
  };
  material.customProgramCacheKey=()=> '3b-tint-v1';
 }
}
