// Recessed window bays, occupied rooms and mineral breakup, without extra meshes.
// The shader decorates the existing collision volume and does not alter navigation.
export function applyFacadeDetail(material,{daylight}){
 const prior=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey.bind(material);
 const baseKey=key();
 material.onBeforeCompile=shader=>{
  prior(shader);shader.uniforms.facadeDay=daylight;
  shader.vertexShader='varying vec3 facadeP;varying vec3 facadeN;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec4 fp=vec4(position,1.);vec3 fnormal=normal;
   #ifdef USE_INSTANCING
   fp=instanceMatrix*fp;fnormal=mat3(instanceMatrix)*fnormal;
   #endif
   facadeP=(modelMatrix*fp).xyz;facadeN=normalize(mat3(modelMatrix)*fnormal);`);
  shader.fragmentShader=`varying vec3 facadeP;varying vec3 facadeN;uniform float facadeDay;
   float facadeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 fn=abs(normalize(facadeN));vec2 wall=vec2(fn.x>fn.z?facadeP.z:facadeP.x,facadeP.y);
   vec2 bay=wall/vec2(3.2,4.4),cell=floor(bay),f=fract(bay);vec2 aa=max(fwidth(bay)*1.25,vec2(.001));
   float vertical=1.-smoothstep(.25,.7,fn.y),above=smoothstep(3.3,4.1,facadeP.y);
   float wx=smoothstep(.17-aa.x,.17+aa.x,f.x)*(1.-smoothstep(.80-aa.x,.80+aa.x,f.x));
   float wy=smoothstep(.20-aa.y,.20+aa.y,f.y)*(1.-smoothstep(.77-aa.y,.77+aa.y,f.y));
   float pane=wx*wy*vertical*above;
   float mineral=.95+.05*facadeHash(floor(wall*8.));
   diffuseColor.rgb*=mineral;
   float room=facadeHash(cell+floor(facadeP.xz*.002)),occupied=step(.60,room);
   float blind=step(.82,room)*step(.48,f.y);
   vec3 glassColor=mix(vec3(.032,.077,.11),vec3(.075,.14,.19),smoothstep(.2,.75,f.y));
   glassColor*=mix(.68,1.,smoothstep(.18,.35,f.x));
   glassColor=mix(glassColor,vec3(.20,.18,.15),blind*.6);
   diffuseColor.rgb=mix(diffuseColor.rgb,glassColor,pane);
   float joint=(1.-smoothstep(.012,.028,min(f.x,1.-f.x)))*vertical;
   diffuseColor.rgb*=1.-joint*.13;
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.27,pane);`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    vec3 interior=mix(vec3(1.,.59,.25),vec3(.39,.65,.83),step(.91,room));
    float furniture=1.-step(.6,f.x)*step(f.y,.33)*.65;
    totalEmissiveRadiance+=interior*pane*occupied*furniture*(.035+pow(1.-facadeDay,1.5)*.68);`);
 };
 material.customProgramCacheKey=()=>baseKey+'-inhabited-facade-v1';
 return material;
}
