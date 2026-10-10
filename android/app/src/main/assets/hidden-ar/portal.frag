precision highp float;
uniform sampler2D uDepth;
uniform mat3 uDepthUV;
uniform bool uHasDepth;
uniform float uTime;
uniform float uLight;
uniform vec3 uLightDirection;
uniform vec2 uViewport;
uniform int uKind;
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vEye;
varying vec4 vClip;
const float PI=3.14159265;
void main(){
 vec3 color;float alpha=1.0;
 if(uKind==0){
  vec3 n=normalize(vNormal),l=normalize(uLightDirection),e=normalize(-vEye);
  float diffuse=max(dot(n,l),0.0),spec=pow(max(dot(n,normalize(l+e)),0.0),72.0);
  float seam=(1.0-smoothstep(0.0,0.07,abs(fract(vUV.x*32.0)-0.5)));
  float vein=pow(max(0.0,sin(vUV.x*80.0+vUV.y*9.0)),18.0);
  color=vec3(0.53,0.39,0.19)*(0.38+diffuse*uLight)+vec3(0.98,0.85,0.54)*spec*uLight;
  color+=vec3(0.12,0.55,0.8)*(seam*0.6+vein*0.12)*(0.85+0.15*sin(uTime*1.4));
 }else if(uKind==1){
  vec2 p=vUV;float r=length(p),a=atan(p.y,p.x);
  float swirl=sin(a*6.0-r*22.0+uTime*1.2)+0.5*sin(a*11.0+r*38.0-uTime*0.7);
  float filaments=pow(max(0.0,0.5+0.5*sin(r*43.0-swirl*1.8-uTime*2.0)),9.0);
  float rim=exp(-abs(r-0.965)*65.0),heart=exp(-r*r*9.0);
  color=mix(vec3(0.008,0.024,0.07),vec3(0.025,0.15,0.24),0.5+swirl*0.25);
  color+=vec3(0.1,0.54,0.86)*filaments*(0.15+r*0.4)+vec3(0.55,0.91,1.0)*rim;
  color+=vec3(0.72,0.58,0.34)*heart*0.5;
  float stars=pow(max(0.0,sin(p.x*97.0+sin(p.y*43.0))*sin(p.y*83.0)),55.0);
  color+=vec3(0.55,0.8,1.0)*stars*(0.5+0.5*sin(uTime+p.x*11.0));
  alpha=1.0-smoothstep(0.97,1.0,r);
 }else if(uKind==2){
  float r=length(vUV);alpha=0.34*exp(-r*r*4.0);color=vec3(0.015,0.04,0.055);
 }else{
  float r=length(vUV);alpha=(1.0-smoothstep(0.015,0.04,abs(r-0.7)))*0.85; color=vec3(0.35,0.86,0.94);
 }
 if(uHasDepth){
  vec2 ndc=gl_FragCoord.xy/uViewport*2.0-1.0;
  vec2 uv=(uDepthUV*vec3(ndc,1.0)).xy;
  if(all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThanEqual(uv,vec2(1.0)))){
   vec2 rg=texture2D(uDepth,uv).rg;
   float meters=(rg.r*255.0+rg.g*65280.0)*0.001;
   if(meters>0.0)alpha*=1.0-smoothstep(0.01,0.08,(-vEye.z)-meters);
  }
 }
 if(alpha<0.005)discard;
 // Filmic compression applies only to virtual content, preserving the real camera feed.
 color=color/(color+vec3(1.0));color=pow(color,vec3(0.4545));
 gl_FragColor=vec4(color,alpha);
}
