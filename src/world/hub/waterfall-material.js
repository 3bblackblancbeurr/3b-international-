import * as T from 'three';
/** Two-sided streaming water with broken strands and foam; one shared draw material. */
export function citeWaterfallMaterial(){
 return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},day:{value:1}},
 vertexShader:'varying vec2 flowUv;uniform float time;void main(){flowUv=uv;vec3 p=position;p.z+=sin(uv.y*28.-time*4.+uv.x*14.)*.045;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
 fragmentShader:`varying vec2 flowUv;uniform float time;uniform float day;
 void main(){float strand=sin(flowUv.x*69.+sin(flowUv.y*18.-time*7.)*1.8)*.5+.5;
 float rush=sin(flowUv.y*85.+time*12.+flowUv.x*9.)*.5+.5;
 float edge=smoothstep(0.,.06,flowUv.x)*smoothstep(0.,.06,1.-flowUv.x);
 float foam=smoothstep(.62,.92,strand)*(.4+.6*rush)+(1.-smoothstep(0.,.15,flowUv.y))*.4;
 vec3 tint=mix(vec3(.08,.42,.62),vec3(.88,.97,1.),clamp(foam,0.,1.));
 gl_FragColor=vec4(tint*(.4+.6*day),edge*(.36+.4*strand));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
