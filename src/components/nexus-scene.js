import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NEXUS_WORLDS, nexusGatePosition, nexusPixelRatio } from './nexus-worlds.js';

const PORTAL_VERTEX = `varying vec2 vUv; void main(){vUv=vec2((position.x+1.38)/2.76,position.y/5.05);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const PORTAL_FRAGMENT = `
  varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uActive;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec2 p=vUv; float t=uTime*.16;
    float veil=sin(p.x*8.+sin(p.y*6.-t)*1.8+t)*.5+.5;
    float veil2=pow(max(0.,sin(p.x*14.+sin(p.y*8.+t)*2.)),12.);
    float vertical=pow(max(0.,1.-abs(p.x-.5)*2.),2.);
    float rows=floor(p.y*72.+uTime*2.); float columns=floor(p.x*29.);
    float bits=step(.81,hash(vec2(columns,rows)))*step(.82,fract(p.y*72.+uTime*2.))*step(.2,fract(p.x*29.));
    float horizon=exp(-pow((p.y-.19)*7.,2.));
    vec3 col=vec3(.007,.014,.028)+uColor*(veil*.075+veil2*.09+bits*.12+vertical*.12+horizon*.16)*(1.+uActive*.3);
    col+=vec3(.6,.49,.3)*pow(max(0.,1.-length((p-vec2(.5,.69))*vec2(2.,1.))),9.)*.15;
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const TUNNEL_FRAGMENT = `
  varying vec2 vUv; uniform float uTime; uniform float uAspect;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec2 p=(vUv-.5)*vec2(uAspect,1.); p.x+=sin(uTime*.35)*.018;
    float r=max(length(p),.013); float a=atan(p.y,p.x)/6.2831853+.5;
    float depth=.19/r; float z=depth+uTime*.78;
    float lane=a*48.+sin(depth*.22+uTime*.13)*.9;
    vec2 cell=vec2(floor(lane),floor(z*13.));
    vec2 f=fract(vec2(lane,z*13.)); float seed=hash(cell);
    float glyph=step(.25,f.x)*step(f.x,.71)*step(.14,f.y)*step(f.y,.85);
    float hole=step(.39,f.x)*step(f.x,.57)*step(.29,f.y)*step(f.y,.68);
    float binary=mix(glyph-hole,glyph*step(.49,f.x),step(.5,seed));
    float trail=pow(fract(z*.13+hash(vec2(cell.x,1.))),5.);
    float lines=pow(1.-abs(fract(lane)-.5)*2.,36.);
    float ribs=pow(1.-abs(fract(z*.56)-.5)*2.,44.);
    float fade=smoothstep(.016,.11,r)*(1.-smoothstep(.48,1.3,r));
    vec3 col=vec3(.003,.009,.018);
    col+=vec3(.08,.47,1.)*(binary*(.12+trail*.6)+lines*.17+ribs*.42)*fade;
    col+=vec3(.48,.82,1.)*pow(trail,4.)*binary*.44*fade;
    col+=vec3(.56,.39,.17)*ribs*.20*fade;
    col+=vec3(.12,.44,.65)*exp(-r*30.)*.55;
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function add(parent, geometry, material, x=0, y=0, z=0) {
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;
}
function box(parent, material, x,y,z,w,h,d) { return add(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z); }
function beam(parent, material, a,b,r=.025) {
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),length=from.distanceTo(to);
  const mesh=add(parent,new THREE.CylinderGeometry(r,r,length,6),material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return mesh;
}
function arch(w,h,pointed=false) {
  const s=new THREE.Shape();s.moveTo(-w,0);s.lineTo(w,0);s.lineTo(w,h-w);
  if(pointed){s.quadraticCurveTo(w,h-.65,0,h);s.quadraticCurveTo(-w,h-.65,-w,h-w);}
  else{s.bezierCurveTo(w,h-w*.35,w*.55,h,0,h);s.bezierCurveTo(-w*.55,h,-w,h-w*.35,-w,h-w);}
  s.lineTo(-w,0);return s;
}
function batchStatic(group) {
  group.updateMatrixWorld(true);const byMaterial=new Map();
  [...group.children].forEach(child=>{
    if(!child.isMesh||Array.isArray(child.material))return;
    const geo=child.geometry.clone().applyMatrix4(child.matrix);
    const key=child.material.uuid;if(!byMaterial.has(key))byMaterial.set(key,{material:child.material,parts:[]});
    byMaterial.get(key).parts.push(geo);child.geometry.dispose();group.remove(child);
  });
  for(const {material,parts} of byMaterial.values()){
    if(parts.length===1){add(group,parts[0],material);continue;}
    const merged=mergeGeometries(parts,false);
    if(merged){parts.forEach(p=>p.dispose());add(group,merged,material);}else{parts.forEach(p=>add(group,p,material));}
  }
}
function makeMonument(code,stone,metal,roof) {
  const g=new THREE.Group();
  if(code==='FR') {
    const levels=[[.22,1.02],[1.25,.68],[2.36,.3],[3.8,.065],[4.35,.035]];
    for(let l=0;l<levels.length-1;l++)for(const sx of [-1,1])for(const sz of [-1,1]){
      const [h,r]=levels[l],[h2,r2]=levels[l+1];
      beam(g,metal,[sx*r,h,sz*r*.48],[sx*r2,h2,sz*r2*.48],l===0?.055:.033);
      if(l<3){beam(g,metal,[sx*r,h,sz*r*.48],[-sx*r2,h2,sz*r2*.48],.016);}
    }
    for(const [h,r] of levels.slice(0,4))box(g,stone,0,h,0,r*2.18,.10,r*1.14);
    beam(g,roof,[0,4.25,0],[0,4.65,0],.018);
  } else if(code==='DZ') {
    add(g,new THREE.CylinderGeometry(1.14,1.22,.25,32),stone,0,.2,0);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3,pts=[];
      for(let k=0;k<=12;k++){const t=k/12,r=1.03*Math.pow(1-t,1.6);pts.push(new THREE.Vector3(Math.sin(a)*r,.35+t*3.8,Math.cos(a)*r*.6));}
      add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.15,7,false),stone);
    }
    add(g,new THREE.ConeGeometry(.23,.72,6),metal,0,4.05,0);
  } else if(code==='ES') {
    box(g,stone,0,.85,0,2.15,1.35,.65);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.52,h=3.55-Math.abs(i-1.5)*.45;
      add(g,new THREE.CylinderGeometry(.09,.19,h,9),stone,x,.3+h/2,0);
      add(g,new THREE.IcosahedronGeometry(.18,0),metal,x,h+.45,0);
      beam(g,roof,[x,h+.56,0],[x,h+.8,0],.018);
      for(let j=0;j<5;j++)add(g,new THREE.TorusGeometry(.16-j*.008,.018,5,12),metal,x,1.4+j*.36,0).rotation.x=Math.PI/2;
    }
    for(let i=-2;i<=2;i++)add(g,new THREE.ConeGeometry(.2,.7,5),stone,i*.4,1.85,.15);
  } else if(code==='MA') {
    for(const x of [-.9,.9]){
      box(g,stone,x,1.4,0,.58,2.4,.65);
      for(let k=0;k<3;k++)box(g,metal,x-.21+k*.21,2.69,.02,.11,.23,.69);
    }
    const outer=arch(.7,2.48,true),hole=arch(.46,1.94,true);outer.holes.push(hole);
    add(g,new THREE.ExtrudeGeometry(outer,{depth:.32,bevelEnabled:false,curveSegments:16}),stone,0,.25,.16);
    for(let y=.6;y<2.4;y+=.24)for(const x of [-.9,.9])box(g,roof,x,y,.345,.34,.045,.015);
    box(g,metal,0,2.88,0,2.55,.1,.85);
  } else if(code==='IT') {
    for(let level=0;level<3;level++){
      const y=.4+level*.76;
      add(g,new THREE.CylinderGeometry(1.23,1.23,.12,32,1,true),stone,0,y,0).scale.z=.7;
      for(let i=0;i<16;i++){
        const a=i*Math.PI*2/16,x=Math.sin(a)*1.19,z=Math.cos(a)*.83;
        box(g,stone,x,y+.34,z,.11,.62,.12);
        const curve=new THREE.EllipseCurve(0,0,.22,.26,0,Math.PI,false,0);
        const pts=curve.getPoints(10).map(p=>new THREE.Vector3(p.x,p.y,0));
        const m=add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.048,5,false),stone,x,y+.45,z);m.rotation.y=a;
      }
    }
    add(g,new THREE.CylinderGeometry(1.25,1.25,.15,32,1,true),metal,0,2.76,0).scale.z=.7;
  } else if(code==='TN') {
    for(let i=0;i<5;i++){
      const m=add(g,new THREE.CylinderGeometry(1.2-i*.12,1.27-i*.12,.18,28,1,true,Math.PI*.2,Math.PI*1.6),stone,0,.2+i*.17,0);m.scale.z=.64;
    }
    for(let i=0;i<9;i++){
      const x=(i-4)*.27,h=2.2+(i%3)*.18;
      add(g,new THREE.CylinderGeometry(.06,.085,h,8),stone,x,h/2+.35,-.28);
      box(g,metal,x,h+.4,-.28,.21,.13,.2);
    }
    box(g,stone,0,2.9,-.28,2.6,.19,.25);
  } else if(code==='TR') {
    box(g,stone,0,.85,0,1.7,1.15,1.25);
    add(g,new THREE.SphereGeometry(.88,22,12,0,Math.PI*2,0,Math.PI/2),roof,0,1.42,0).scale.y=.82;
    for(const x of [-1.04,1.04])for(const z of [-.52,.52]){
      add(g,new THREE.CylinderGeometry(.065,.105,2.75,9),stone,x,1.55,z);
      add(g,new THREE.ConeGeometry(.11,.57,9),roof,x,3.2,z);
      add(g,new THREE.CylinderGeometry(.145,.145,.07,10),metal,x,2.55,z);
    }
    beam(g,metal,[0,2.1,0],[0,2.57,0],.023);
  } else {
    box(g,stone,0,.93,0,2.35,1.3,.46);
    for(const [x,h] of [[-.98,2.12],[0,2.85],[.98,2.25]]){
      add(g,new THREE.CylinderGeometry(.24,.29,h,10),stone,x,h/2+.25,0);
      add(g,new THREE.ConeGeometry(.36,.86,10),roof,x,h+.66,0);
      for(let j=0;j<3;j++)box(g,metal,x,h*.45+j*.4,.256,.08,.16,.025);
    }
    for(let k=0;k<11;k++)box(g,stone,-1.12+k*.225,1.66,.05,.12,.25,.55);
  }
  batchStatic(g);return g;
}

export function createNexusScene(host,{onSelect=()=>{},onReady=()=>{},onFailure=()=>{},onQuality=()=>{}}={}) {
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){throw new Error('WebGL indisponible : '+error.message);}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.setClearColor(0x050a12);renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x070d18,.016);
  const camera=new THREE.PerspectiveCamera(46,1,.1,180);camera.position.set(0,6.4,30);
  const target=new THREE.Vector3(0,2.6,-6),look=target.clone(),desired=camera.position.clone();
  const room=new THREE.Group();scene.add(room);
  const resources=[];
  try{
    const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    const map=pmrem.fromScene(env,.035);scene.environment=map.texture;resources.push(map);env.dispose();pmrem.dispose();
  }catch{/* Direct lighting remains sufficient when environment generation is unavailable. */}
  scene.add(new THREE.HemisphereLight(0x83b9ef,0x3b2a1d,2.0));
  const key=new THREE.DirectionalLight(0xf5dfb5,3.7);key.position.set(-8,13,12);scene.add(key);
  const rim=new THREE.DirectionalLight(0x4a91ff,3.2);rim.position.set(8,7,-13);scene.add(rim);
  const fill=new THREE.PointLight(0x5db9ff,65,24,2);fill.position.set(0,5,1);scene.add(fill);
  const dark=new THREE.MeshStandardMaterial({color:0x162532,metalness:.67,roughness:.31});
  const stone=new THREE.MeshStandardMaterial({color:0xb9af99,metalness:.25,roughness:.52});
  const gold=new THREE.MeshStandardMaterial({color:0xb5a077,metalness:.83,roughness:.24});
  const blue=new THREE.MeshStandardMaterial({color:0x82d7ff,metalness:.42,roughness:.23,emissive:0x167aab,emissiveIntensity:.9});
  const glow=new THREE.MeshBasicMaterial({color:0x84d9ff,transparent:true,opacity:.58,toneMapped:false});
  const warmGlow=new THREE.MeshBasicMaterial({color:0xd7c291,transparent:true,opacity:.5,toneMapped:false});

  const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=512;
  const ctx=floorCanvas.getContext('2d');
  if(ctx){ctx.fillStyle='#273644';ctx.fillRect(0,0,512,512);for(let i=0;i<160;i++){
    ctx.strokeStyle=`rgba(160,183,198,${.013+(i%5)*.009})`;ctx.lineWidth=i%8===0?2:.55;ctx.beginPath();
    for(let j=0;j<=16;j++){const x=j*32,y=(i*37+Math.sin(j*.43+i*1.7)*40+j*9)%560; if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }}
  const floorTexture=new THREE.CanvasTexture(floorCanvas);floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;floorTexture.repeat.set(6,6);floorTexture.colorSpace=THREE.SRGBColorSpace;resources.push(floorTexture);
  const floorMat=new THREE.MeshStandardMaterial({map:floorTexture,color:0x546a7c,metalness:.7,roughness:.27});
  add(room,new THREE.CylinderGeometry(26,27,.5,96),floorMat,0,-.4,-3);
  for(const r of [3.2,3.4,5.5,11,17.7,21])add(room,new THREE.TorusGeometry(r,.022,5,128),r<6?warmGlow:glow,0,-.12,-3).rotation.x=Math.PI/2;
  for(let i=0;i<32;i++){
    const a=i*Math.PI/16;
    beam(room,i%4===0?gold:dark,[Math.sin(a)*4,-.1,Math.cos(a)*4-3],[Math.sin(a)*23,-.1,Math.cos(a)*23-3],i%4===0?.025:.016);
  }
  const pillars=new THREE.InstancedMesh(new THREE.CylinderGeometry(.36,.55,16,10),dark,24),dummy=new THREE.Object3D();
  for(let i=0;i<24;i++){const a=i*Math.PI/12;dummy.position.set(Math.sin(a)*23,7.8,Math.cos(a)*23-3);dummy.updateMatrix();pillars.setMatrixAt(i,dummy.matrix);}room.add(pillars);
  for(const y of [9.5,14])add(room,new THREE.TorusGeometry(23,.075,6,96),gold,0,y,-3).rotation.x=Math.PI/2;
  const ceiling=add(room,new THREE.TorusGeometry(8,.12,8,96),gold,0,12,-3);ceiling.rotation.x=Math.PI/2;
  add(room,new THREE.TorusGeometry(7.85,.025,5,96),glow,0,11.95,-3).rotation.x=Math.PI/2;
  batchStatic(room);

  const dustGeometry=new THREE.BufferGeometry(),dust=new Float32Array(540*3);
  for(let i=0;i<540;i++){dust[i*3]=Math.sin(i*127.1)*28;dust[i*3+1]=1+(i*7.73%17);dust[i*3+2]=Math.cos(i*311.7)*27-5;}
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dust,3));
  const particles=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0x90bcd6,size:.045,transparent:true,opacity:.5,depthWrite:false}));scene.add(particles);

  const gates=[],hitboxes=[];
  for(let i=0;i<NEXUS_WORLDS.length;i++){
    const world=NEXUS_WORLDS[i],p=nexusGatePosition(i),group=new THREE.Group();group.position.set(p.x,0,p.z);group.rotation.y=Math.atan2(-p.x,22-p.z);scene.add(group);
    const masonry=new THREE.Group();group.add(masonry);const pointed=['MA','DZ','TR'].includes(world.code);
    const outer=arch(1.69,5.6,pointed),inner=arch(1.39,5.11,pointed);outer.holes.push(inner);
    add(masonry,new THREE.ExtrudeGeometry(outer,{depth:.4,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:2,curveSegments:24}),dark,0,.11,-.13);
    const curve=new THREE.CatmullRomCurve3(inner.getPoints(60).map(v=>new THREE.Vector3(v.x,v.y+.11,.33)),true);
    add(masonry,new THREE.TubeGeometry(curve,100,.025,6,true),gold);
    for(const x of [-1.53,1.53]){
      add(masonry,new THREE.CylinderGeometry(.085,.11,3.8,10),gold,x,2.03,.34);
      box(masonry,stone,x,.18,.03,.46,.27,.8);box(masonry,gold,x,3.97,.1,.29,.13,.55);
    }
    for(let j=0;j<3;j++)box(masonry,j===2?gold:dark,0,.035+j*.033,.65+j*.23,3.8+j*.22,.065,.6);
    const portalMat=new THREE.ShaderMaterial({vertexShader:PORTAL_VERTEX,fragmentShader:PORTAL_FRAGMENT,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(world.color)},uActive:{value:0}},side:THREE.DoubleSide});
    const portal=add(group,new THREE.ShapeGeometry(inner,32),portalMat,0,.11,-.38);
    const roof=new THREE.MeshStandardMaterial({color:world.color,metalness:.68,roughness:.32,emissive:world.color,emissiveIntensity:.10});
    const monument=makeMonument(world.code,stone,gold,roof);monument.scale.setScalar(.88);monument.position.set(0,.23,.02);group.add(monument);
    const trimMat=new THREE.MeshBasicMaterial({color:world.color,transparent:true,opacity:.62,toneMapped:false});
    const trim=add(group,new THREE.TorusGeometry(.12,.02,5,20),trimMat,0,5.43,.42);
    const hit=add(group,new THREE.PlaneGeometry(3.6,5.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),0,2.9,.7);hit.userData.code=world.code;hitboxes.push(hit);
    batchStatic(masonry);gates.push({group,portal,trim,portalMat,p,world});
  }
  const core=new THREE.Group();core.position.set(0,3.45,-.7);scene.add(core);
  for(let i=0;i<8;i++){
    const fragment=add(core,new THREE.TorusGeometry(1.48,.13,10,28,Math.PI/4-.135),gold,0,0,Math.sin(i*2)*.1);fragment.rotation.z=i*Math.PI/4;
    const edge=add(core,new THREE.TorusGeometry(1.66,.017,5,30,Math.PI/4-.16),glow);edge.rotation.z=i*Math.PI/4;
  }
  const crystal=add(core,new THREE.IcosahedronGeometry(.56,0),blue);
  const sealCanvas=document.createElement('canvas');sealCanvas.width=512;sealCanvas.height=256;
  const sc=sealCanvas.getContext('2d');if(sc){sc.clearRect(0,0,512,256);sc.fillStyle='#d8edff';sc.textAlign='center';sc.textBaseline='middle';sc.font='bold 128px Arial';sc.fillText('3B',256,136);}
  const sealTexture=new THREE.CanvasTexture(sealCanvas);sealTexture.colorSpace=THREE.SRGBColorSpace;resources.push(sealTexture);
  const seal=add(core,new THREE.PlaneGeometry(1.35,.675),new THREE.MeshBasicMaterial({map:sealTexture,transparent:true,depthWrite:false,toneMapped:false}),0,0,.72);
  const plinth=add(scene,new THREE.CylinderGeometry(2.3,2.8,.38,48),dark,0,.08,-.7);
  add(scene,new THREE.TorusGeometry(2.15,.033,6,80),warmGlow,0,.29,-.7).rotation.x=Math.PI/2;

  const origin=new THREE.Group();origin.position.set(0,0,-19);scene.add(origin);
  const originShape=arch(2.4,7.6,true),originHole=arch(1.98,6.98,true);originShape.holes.push(originHole);
  add(origin,new THREE.ExtrudeGeometry(originShape,{depth:.55,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:1,curveSegments:20}),gold);
  add(origin,new THREE.ShapeGeometry(originHole,24),dark,0,0,.03);
  beam(origin,gold,[0,.15,.1],[0,6.94,.1],.028);
  for(const r of [.68,.85])add(origin,new THREE.TorusGeometry(r,.035,7,64),gold,0,3.1,.15);
  add(origin,new THREE.OctahedronGeometry(.24,0),gold,0,3.1,.27);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(origin,new THREE.OctahedronGeometry(.09,0),warmGlow,Math.sin(a)*1.06,3.1+Math.cos(a)*1.06,.15);}
  for(const x of [-1.72,1.72])for(let y=.7;y<5.8;y+=.52)box(origin,gold,x,y,.16,.06,.22,.035);
  batchStatic(origin);

  const tunnelScene=new THREE.Scene(),tunnelCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const tunnelMaterial=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:TUNNEL_FRAGMENT,uniforms:{uTime:{value:0},uAspect:{value:1}},depthTest:false,depthWrite:false});
  add(tunnelScene,new THREE.PlaneGeometry(2,2),tunnelMaterial);
  let state={phase:'scan',selected:null,reducedMotion:false,paused:false,quality:'auto'},disposed=false,failed=false,width=1,height=1,frame=0,last=0,time=0,slowFrames=0,autoLight=false;
  const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();let down=null;
  function resize(){if(disposed)return;width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setPixelRatio(nexusPixelRatio(width,window.devicePixelRatio,autoLight?'light':state.quality));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();tunnelMaterial.uniforms.uAspect.value=width/height;render();}
  function render(){
    if(disposed||failed)return;
    try{
      const focused=gates.find(g=>g.world.code===state.selected),originFocused=state.selected==='ORIGIN';
      if(focused){const a=focused.group.rotation.y,d=width<760?10.5:11.7;desired.set(focused.p.x+Math.sin(a)*d,3.5,focused.p.z+Math.cos(a)*d);target.set(focused.p.x,2.65,focused.p.z);}
      else if(originFocused){desired.set(0,4.7,-5.3);target.set(0,3.5,-19);}
      else{desired.set(0,width<760?7.8:6.4,width<760?43:29);target.set(0,2.7,-6);}
      const blend=state.reducedMotion||state.paused?1:.085;camera.position.lerp(desired,blend);look.lerp(target,blend);camera.lookAt(look);
      if(state.selected&&width>=1000)camera.setViewOffset(width,height,-width*.14,0,width,height);else camera.clearViewOffset();
      core.rotation.y=state.reducedMotion?0:Math.sin(time*.18)*.11;core.position.y=3.45+(state.reducedMotion?0:Math.sin(time*.7)*.085);crystal.rotation.y=time*.2;seal.lookAt(camera.position);particles.rotation.y=time*.004;
      for(const g of gates){g.portalMat.uniforms.uTime.value=time;g.portalMat.uniforms.uActive.value=g.world.code===state.selected?1:0;g.trim.rotation.z=time*.24;}
      tunnelMaterial.uniforms.uTime.value=time;
      if(state.phase==='tunnel'&&!state.reducedMotion)renderer.render(tunnelScene,tunnelCamera);else renderer.render(scene,camera);
      if(frame++===0)onReady();
    }catch(error){failed=true;renderer.setAnimationLoop(null);onFailure(error);}
  }
  function tick(now){
    if(disposed||failed)return;const delta=last?Math.min((now-last)/1000,.1):.016;last=now;time+=delta;
    if(delta>.032&&frame>45)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    if(!autoLight&&state.quality==='auto'&&slowFrames>70){autoLight=true;renderer.setPixelRatio(1);onQuality('light');}
    render();
  }
  function schedule(){renderer.setAnimationLoop(null);last=0;if(!disposed&&!failed&&!document.hidden&&!state.reducedMotion&&!state.paused)renderer.setAnimationLoop(tick);else render();}
  function pointerDown(e){down={x:e.clientX,y:e.clientY};}
  function pointerUp(e){if(state.phase!=='nexus'||!down)return;const movement=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(movement>8)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(hitboxes,false)[0];if(hit)onSelect(hit.object.userData.code);}
  function lost(e){e.preventDefault();failed=true;renderer.setAnimationLoop(null);onFailure(new Error('Contexte graphique interrompu'));}
  const observer=new ResizeObserver(resize);observer.observe(host);
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',schedule);
  resize();schedule();
  return {
    update(next){if(disposed)return;state={...state,...next};resize();schedule();},
    dispose(){
      if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer.disconnect();document.removeEventListener('visibilitychange',schedule);
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set(),materials=new Set();for(const root of [scene,tunnelScene])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
