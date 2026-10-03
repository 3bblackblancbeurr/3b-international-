import * as THREE from 'three';
const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float clouds(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.07)*.15;}`;
export function cityRidgeGeometry(half,layer=0){
 const geometry=new THREE.PlaneGeometry(half*5,half*.52,160,10),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),v=(p.getY(i)/ (half*.52)+.5);const ridge=half*(.08+.10*Math.pow(Math.sin(x/half*3.7+layer*.8),2)+.055*Math.sin(x/half*8.4+layer)*Math.sin(x/half*5.1));p.setXYZ(i,x,Math.max(0,ridge)*v,-half*(2.6+layer*.7)+(1-v)*half*.35+Math.sin(x/half*2.2+layer)*half*.05*v);}
 geometry.computeVertexNormals();return geometry;
}
export function createCityNaturalEnvironment(){
 const time={value:0},night={value:0},extent={value:500};
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTime:time,uNight:night},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uTime,uNight;varying vec3 direction;${noise}
 void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec3 color=mix(vec3(.70,.80,.87),vec3(.17,.42,.66),pow(h,.45));vec3 sun=normalize(vec3(-.58,.18,-.80));float angle=dot(d,sun);color+=vec3(.35,.28,.17)*pow(max(angle,0.),48.);color=mix(color,vec3(1.,.96,.86),smoothstep(.99978,.99994,angle));
 vec2 uv=d.xz/max(.14,d.y)*.55+vec2(uTime*.002,0.);float field=clouds(uv);float cloud=smoothstep(.51,.72,field)*smoothstep(.015,.11,d.y);vec3 cloudColor=mix(vec3(.64,.71,.76),vec3(.97,.98,.98),smoothstep(.52,.78,field));color=mix(color,cloudColor,cloud*.86);color=mix(color,color*vec3(.36,.47,.64),uNight);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(2600,32,16),skyMaterial);sky.frustumCulled=false;
 const water=new THREE.ShaderMaterial({uniforms:{uTime:time,uNight:night,uExtent:extent},vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,fragmentShader:`uniform float uTime,uNight,uExtent;varying vec3 world;
 void main(){vec2 p=world.xz;float a=dot(p,vec2(.16,.09))-uTime*1.3,b=dot(p,vec2(-.28,.20))+uTime*.83,c=dot(p,vec2(.66,.35))-uTime*1.7;vec2 slope=vec2(.16,.09)*cos(a)*.34+vec2(-.28,.20)*cos(b)*.16+vec2(.66,.35)*cos(c)*.035;vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),eye=normalize(cameraPosition-world);float fresnel=pow(1.-max(dot(n,eye),0.),3.);float sparkle=pow(max(dot(reflect(-normalize(vec3(-.58,.38,-.8)),n),eye),0.),64.);float crest=smoothstep(.91,1.,sin(a)*.63+sin(b)*.32+sin(c)*.05);float shore=max(abs(p.x),abs(p.y))-uExtent;float foam=(1.-smoothstep(0.,3.5,shore))*step(0.,shore)*smoothstep(.3,.95,sin(a+uTime)*.5+.5);vec3 color=mix(vec3(.035,.24,.29),vec3(.31,.49,.57),fresnel);color+=crest*vec3(.08,.16,.16)+sparkle*vec3(.75,.71,.55);color=mix(color,vec3(.74,.82,.80),foam*.55);color=mix(color,color*.48,uNight);float mist=smoothstep(1100.,2700.,length(cameraPosition-world));color=mix(color,vec3(.70,.80,.87)*(1.-uNight*.6),mist);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const grass=new THREE.MeshStandardMaterial({color:0x73925b,roughness:1,metalness:0});
 grass.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 grassWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ngrassWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 grassWorld;\n'+noise).replace('#include <color_fragment>',`#include <color_fragment>\nfloat broad=noise(grassWorld.xz*.09),grain=noise(grassWorld.xz*3.);diffuseColor.rgb*=mix(vec3(.74,.86,.64),vec3(1.10,1.04,.81),broad)*(.89+grain*.19);`);
 };
 grass.customProgramCacheKey=()=> 'city-grass-natural-v1';
 return {sky,grass,water,time,night,extent,update(seconds,camera,reduced=false){time.value=reduced?0:seconds;sky.position.copy(camera.position);},configure(half,isNight){extent.value=half;night.value=isNight?1:0;},dispose(){sky.geometry.dispose();skyMaterial.dispose();grass.dispose();water.dispose();}};
}
