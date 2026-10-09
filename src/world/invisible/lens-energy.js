import * as THREE from 'three';

// Original procedural effects: bounded fragment work, no texture downloads or full-screen bloom.
// The portal is a window in the arch; the camera remains visible outside its geometry.
export function createPortalSurface({width,height,tint,gold,night}){
 return new THREE.ShaderMaterial({
  name:'invisible-portal-galaxy',transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{time:{value:0},reveal:{value:1},pulse:{value:0},width:{value:width},height:{value:height},tint:{value:new THREE.Color(tint)},gold:{value:new THREE.Color(gold)},night:{value:new THREE.Color(night)}},
  vertexShader:`varying vec2 localPosition;
   void main(){localPosition=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float time,reveal,pulse,width,height;
   uniform vec3 tint,gold,night;
   varying vec2 localPosition;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0)),f.x),f.y);}
   void main(){
    vec2 p=vec2(localPosition.x/width,(localPosition.y-height*.5)/(height*.5));
    float r=length(p),angle=atan(p.y,p.x),spin=angle-r*6.2+time*.17;
    vec2 flow=vec2(cos(spin),sin(spin))*r*3.8;
    float mist=noise(flow+time*.04)*.56+noise(flow*2.1-time*.03)*.28+noise(flow*4.2)*.16;
    float spiral=pow(.5+.5*sin(spin*3.0+r*8.0),5.0)*exp(-r*1.25);
    float halo=exp(-pow((r-.27)*8.0,2.0));
    vec3 color=mix(night,tint,mist*.38)+tint*spiral*(.85+mist)+gold*halo*.68;
    color*=smoothstep(.065,.18,r);
    vec2 stars=(p+vec2(time*.006,0.0))*56.0;
    float star=step(.987,hash(floor(stars)))*pow(max(0.0,1.0-length(fract(stars)-.5)*2.0),5.0);
    color+=gold*star*(1.0+.3*sin(time+hash(floor(stars))*30.0));
    color+=gold*pulse*(.08+halo*.55+spiral*.2);
    float appearance=smoothstep(0.0,1.0,reveal);
    gl_FragColor=vec4(color,(.86+spiral*.1)*appearance);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
 });
}

export function createEnergyDust({color,gold}){
 return new THREE.ShaderMaterial({
  name:'invisible-energy-dust',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{time:{value:0},reveal:{value:1},color:{value:new THREE.Color(color)},gold:{value:new THREE.Color(gold)}},
  vertexShader:`uniform float time;attribute float phase;varying float brightness;
   void main(){vec3 p=position;p.y+=sin(time*.35+phase)*.11;p.x+=sin(time*.12+phase)*.05;vec4 eye=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*eye;gl_PointSize=clamp(34.0/max(.1,-eye.z),2.0,10.0);brightness=.45+.35*sin(time*.6+phase);}`,
  fragmentShader:`uniform vec3 color,gold;uniform float reveal;varying float brightness;
   void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0)discard;float glow=pow(1.0-d,2.0);gl_FragColor=vec4(mix(color,gold,glow),glow*brightness*reveal);
    #include <colorspace_fragment>
   }`,
 });
}
