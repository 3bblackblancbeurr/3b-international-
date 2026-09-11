import * as THREE from 'three';

// Open a soft, screen-sized sightline through scenery instead of moving the
// camera. Stable dither writes depth normally, so batched walls need no sorting.
export function createSceneryOcclusion(){
 const target={value:new THREE.Vector3()},camera={value:new THREE.Vector3(0,20,24)},enabled={value:1};
 const marked=new WeakSet();
 function apply(material){
  if(!material?.isMeshStandardMaterial||marked.has(material))return;
  marked.add(material);
  const previous=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=shader=>{
   previous(shader);Object.assign(shader.uniforms,{cityTarget:target,cityCamera:camera,cityFade:enabled});
   shader.vertexShader='varying vec3 vCityPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvCityPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
   shader.fragmentShader='varying vec3 vCityPosition; uniform vec3 cityTarget; uniform vec3 cityCamera; uniform float cityFade;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    vec3 sight = cityCamera - cityTarget;
    float along = dot(vCityPosition - cityTarget, sight) / max(dot(sight, sight), .01);
    float radius = mix(2.6, 5.2, clamp(along, 0., 1.));
    float side = length(vCityPosition - cityTarget - sight * along);
    float cut = (1. - smoothstep(radius * .66, radius, side)) * smoothstep(.015, .09, along) * (1. - smoothstep(1., 1.08, along)) * cityFade;
    float pattern = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(.06711056, .00583715))));
    if(pattern < cut) discard;
   `);
  };
  material.customProgramCacheKey=()=> '3b-scenery-sightline-v1';material.needsUpdate=true;
 }
 return {apply,update(view,focus,active=true){camera.value.copy(view);target.value.copy(focus);enabled.value=active?1:0;}};
}
