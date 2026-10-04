import * as T from 'three';
/** Flowing, broken sheets with downward advection, crest foam and impact fade. */
export function citeWaterfallMaterial(){
 return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},day:{value:1}},
 vertexShader:`varying vec2 flowUv;uniform float time;void main(){flowUv=uv;vec3 p=position;float fall=1.-uv.y;p.x+=sin(uv.y*19.-time*3.+uv.x*17.)*.08*fall;p.z+=cos(uv.y*23.-time*4.+uv.x*13.)*.08*fall;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 flowUv;uniform float time;uniform float day;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 void main(){
 vec2 advected=vec2(flowUv.x*32.,flowUv.y*7.+time*3.2);
 float strands=noise(advected)+noise(advected*vec2(1.8,2.3))*.35;
 float edge=smoothstep(0.,.07,flowUv.x)*smoothstep(0.,.07,1.-flowUv.x);
 float impact=1.-smoothstep(0.,.2,flowUv.y),crest=smoothstep(.93,1.,flowUv.y);
 float foam=clamp(smoothstep(.62,1.1,strands)*.65+impact*.5+crest*.28,0.,1.);
 vec3 tint=mix(vec3(.065,.32,.43),vec3(.77,.9,.94),foam);
 float broken=smoothstep(.12,.35,strands);
 gl_FragColor=vec4(tint*(.28+.72*day),edge*broken*(.42+foam*.3));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
