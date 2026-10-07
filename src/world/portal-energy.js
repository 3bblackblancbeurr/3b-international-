import * as THREE from 'three';

/**
 * The eight thresholds share one restrained, GPU-driven resonance effect.
 * The stone arch, atlas preview and physical crossing remain authoritative.
 * No new gameplay, reward or teleport side effect is introduced here.
 */
export function createPortalEnergy({accent='#74cfff',region='hub'}={}){
 const group=new THREE.Group();
 group.name='3B-Portal-Resonance-'+region;
 const geometry=[],materials=[],keepGeometry=value=>(geometry.push(value),value),keepMaterial=value=>(materials.push(value),value);
 const tint=new THREE.Color(accent);
 const veil=keepMaterial(new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{uTime:{value:0},uStrength:{value:.25},uTint:{value:tint}},
  vertexShader:`
   varying vec2 vUv;
   void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,
  fragmentShader:`
   varying vec2 vUv;
   uniform float uTime;
   uniform float uStrength;
   uniform vec3 uTint;
   void main(){
    vec2 p=(vUv-.5)*2.0;
    float r=length(p);
    float angular=atan(p.y,p.x);
    float mask=1.0-smoothstep(.74,.99,r);
    float spiral=sin(angular*7.0-r*27.0+uTime*1.65)*.5+.5;
    float wave=pow(.5+.5*sin(r*41.0-uTime*2.8),4.0);
    float lightning=pow(max(0.0,sin(angular*13.0+uTime*.85+r*8.0)),14.0);
    float inner=(1.0-smoothstep(0.0,.68,r))*(.018+.038*spiral);
    float rim=exp(-pow((r-.78)*18.0,2.0))*(.18+.22*wave);
    float rays=(.025+.075*lightning)*smoothstep(.12,.78,r);
    float alpha=mask*(inner+rim+rays)*uStrength;
    vec3 glow=mix(uTint,vec3(1.0,.84,.53),clamp(wave*.35+rim*.65,0.0,.85));
    gl_FragColor=vec4(glow,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `
 }));
 const membrane=new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(5.65,6.5)),veil);
 membrane.name='3B-Portal-Living-Membrane';membrane.position.set(0,4.08,.56);membrane.renderOrder=4;group.add(membrane);
 const rings=[];
 for(let i=0;i<3;i++){
  const material=keepMaterial(new THREE.MeshBasicMaterial({
   color:i===1?'#e8c989':tint,transparent:true,opacity:.12,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  }));
  const ring=new THREE.Mesh(keepGeometry(new THREE.RingGeometry(2.05+i*.23,2.075+i*.23,96)),material);
  ring.name='3B-Portal-Wave-'+i;ring.position.set(0,4.08,.61+i*.014);ring.scale.y=1.22;ring.renderOrder=5+i;
  rings.push(ring);group.add(ring);
 }
 // One draw call for all dust motes, with deterministic positions for stable snapshots.
 const count=42,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const angle=i*2.399963229728653,radial=Math.sqrt((i*.61803398875)%1);
  positions[i*3]=Math.cos(angle)*2.38*radial;
  positions[i*3+1]=4.08+Math.sin(angle)*2.78*radial;
  positions[i*3+2]=.68+((i*13)%7)*.003;
 }
 const sparksGeometry=keepGeometry(new THREE.BufferGeometry());
 sparksGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const sparksMaterial=keepMaterial(new THREE.PointsMaterial({
  color:'#f6da91',size:.085,transparent:true,opacity:.2,depthWrite:false,
  blending:THREE.AdditiveBlending,sizeAttenuation:true,
 }));
 const sparks=new THREE.Points(sparksGeometry,sparksMaterial);sparks.name='3B-Portal-Stars';sparks.renderOrder=8;group.add(sparks);
 let time=0,disposed=false;
 function tick(distance,dt,{reducedMotion=false}={}){
  if(disposed)return;
  const near=Math.max(0,1-Math.max(0,(Number.isFinite(distance)?distance:60)-3)/24);
  const next=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
  if(!reducedMotion)time+=next;
  veil.uniforms.uTime.value=time;
  veil.uniforms.uStrength.value=reducedMotion?.38:.35+near*.82;
  for(let i=0;i<rings.length;i++){
   const ring=rings[i],phase=time*(.9+i*.28)+i*2.1;
   ring.rotation.z=reducedMotion?0:Math.sin(phase*.4)*.12;
   ring.scale.x=reducedMotion?1:.92+Math.sin(phase)*.045;
   ring.scale.y=(reducedMotion?1:.92+Math.sin(phase)*.045)*1.22;
   ring.material.opacity=(reducedMotion?.09:.10+.10*(.5+.5*Math.sin(phase)))*(1+near*.7);
  }
  sparks.rotation.z=reducedMotion?0:Math.sin(time*.22)*.11;
  sparksMaterial.opacity=reducedMotion?.12:.16+near*.26;
 }
 return{
  group,tick,
  get state(){return{time,strength:veil.uniforms.uStrength.value,particleCount:count};},
  dispose(){if(disposed)return;disposed=true;group.clear();geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());}
 };
}
