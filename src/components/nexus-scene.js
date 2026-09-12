import * as T from 'three';
import {NEXUS_DOORS} from './nexus-data.js';

// Loaded only when the passport opens. No external textures, video or new dependencies.
export function createNexusScene(canvas,{onFailure=()=>{}}={}) {
  let renderer;
  try {renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});} catch {onFailure();return null;}
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.setClearColor(0x03070c,1);
  const scene=new T.Scene();scene.fog=new T.FogExp2(0x03070c,.019);
  const camera=new T.PerspectiveCamera(48,1,.1,180);
  const hall=new T.Group(),tunnel=new T.Group();scene.add(hall,tunnel);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const geo=x=>(geometries.add(x),x),mat=x=>(materials.add(x),x),tex=x=>(textures.add(x),x);
  try {
  const metal=mat(new T.MeshStandardMaterial({color:0x7c7564,metalness:.78,roughness:.32}));
  const black=mat(new T.MeshStandardMaterial({color:0x0c1820,metalness:.6,roughness:.38}));
  const gold=mat(new T.MeshStandardMaterial({color:0xdbc28d,metalness:.72,roughness:.24,emissive:0x624619,emissiveIntensity:.23}));
  const cube=geo(new T.BoxGeometry(1,1,1));
  const addMesh=(parent,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  const box=(parent,x,y,z,sx,sy,sz,m=black)=>{const o=addMesh(parent,cube,m,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const glow=(color,opacity=1)=>mat(new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,toneMapped:false}));
  const cyan=glow(0x7ddcff),dimGold=glow(0xbda978,.55);
  scene.add(new T.HemisphereLight(0xbddaff,0x111018,2.4));
  const keyLight=new T.DirectionalLight(0xffddb0,4);keyLight.position.set(-7,12,10);scene.add(keyLight);
  const rim=new T.DirectionalLight(0x3b93ff,5);rim.position.set(10,7,-14);scene.add(rim);
  const lamp=new T.PointLight(0x80dfff,70,25,2);lamp.position.set(0,5,0);hall.add(lamp);

  function texture(width,height,paint) {
    const c=document.createElement('canvas');c.width=width;c.height=height;
    const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas unavailable');paint(ctx,width,height);
    const t=tex(new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;return t;
  }
  const stone=texture(512,512,(c,w,h)=>{
    c.fillStyle='#10171b';c.fillRect(0,0,w,h);
    for(let i=0;i<1600;i++){const v=22+(i*17%23);c.fillStyle=`rgba(${v+15},${v+20},${v+24},.18)`;c.fillRect(i*113%w,i*59%h,1+(i%3),1);}
    c.strokeStyle='#273136';c.lineWidth=1;c.strokeRect(2,2,w-4,h-4);c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();
  });stone.wrapS=stone.wrapT=T.RepeatWrapping;stone.repeat.set(14,14);
  const floorMat=mat(new T.MeshStandardMaterial({map:stone,color:0xb8c4cd,metalness:.62,roughness:.3}));
  const floor=addMesh(hall,geo(new T.CircleGeometry(42,96)),floorMat);floor.rotation.x=-Math.PI/2;
  const disc=addMesh(hall,geo(new T.CylinderGeometry(4.4,4.7,.22,80)),black,0,.08,-2);
  function ring(parent,radius,tube,material,x,y,z,arc=Math.PI*2) {
    return addMesh(parent,geo(new T.TorusGeometry(radius,tube,6,Math.max(16,Math.round(64*arc/(Math.PI*2))),arc)),material,x,y,z);
  }
  for(const r of [2.8,4.1,4.6,8.6,14.3,18]){const o=ring(hall,r,.012,dimGold,0,.22,-2);o.rotation.x=-Math.PI/2;}
  // Eight spokes inlaid into the stone, not a floating UI grid.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const line=box(hall,Math.sin(a)*7,.225,Math.cos(a)*7-2,.018,.01,5,dimGold);line.rotation.y=a;}
  const core=new T.Group();core.position.set(0,4,-2);hall.add(core);
  const pieces=[];
  for(let i=0;i<8;i++){
    const p=new T.Group();const angle=i*Math.PI/4;
    p.rotation.z=angle;const arc=ring(p,2.05,.13,gold,0,0,0,.61);arc.rotation.z=.09;
    const seam=ring(p,2.27,.017,cyan,0,0,0,.59);seam.rotation.z=.1;
    p.position.set(Math.cos(angle+.35)*.1,Math.sin(angle+.35)*.1,((i%3)-1)*.12);core.add(p);pieces.push(p);
  }
  const emblemMap=texture(512,512,(c)=>{c.textAlign='center';c.fillStyle='#e6d2a4';c.font='700 160px Arial';c.fillText('3B',256,280);c.font='18px monospace';c.fillStyle='#91bbc9';c.fillText('L ’ H É R I T A G E',256,326);});
  addMesh(core,geo(new T.PlaneGeometry(2.5,2.5)),mat(new T.MeshBasicMaterial({map:emblemMap,transparent:true,depthWrite:false})),0,0,.2);
  // Soft grounded halo; no expensive real-time reflection or shadow pass.
  const haloMap=texture(128,128,(c)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(99,180,220,.36)');g.addColorStop(.4,'rgba(33,90,160,.15)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
  const halo=addMesh(hall,geo(new T.PlaneGeometry(14,14)),mat(new T.MeshBasicMaterial({map:haloMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending})),0,.24,-2);halo.rotation.x=-Math.PI/2;

  function outline(shape) {
    if(shape==='spire')return [[-1.45,0],[-1.45,3.8],[-.9,4.2],[-.9,4.65],[0,5.5],[.9,4.65],[.9,4.2],[1.45,3.8],[1.45,0]];
    if(shape==='facet')return [[-1.25,0],[-1.65,1.2],[-1.65,3.85],[-.75,5.25],[.75,5.25],[1.65,3.85],[1.65,1.2],[1.25,0]];
    if(shape==='terrace')return [[-1.5,0],[-1.5,4.4],[-1.1,4.4],[-1.1,4.9],[1.1,4.9],[1.1,4.4],[1.5,4.4],[1.5,0]];
    if(shape==='ogive')return [[-1.5,0],[-1.5,3.1],[-1.38,3.8],[-.8,4.65],[0,5.5],[.8,4.65],[1.38,3.8],[1.5,3.1],[1.5,0]];
    const pts=[[-1.45,0],[-1.45,3.2]];
    for(let i=0;i<=28;i++){
      const a=Math.PI-i*Math.PI/28;
      let r=1.45;if(shape==='scallop')r+=Math.sin(i/28*Math.PI*7)*.12;
      if(shape==='horseshoe'||shape==='keyhole')r=1.72;
      pts.push([Math.cos(a)*r,3.2+Math.sin(a)*r+(shape==='keyhole'?.18:0)]);
    }
    pts.push([1.45,3.2],[1.45,0]);return pts;
  }
  const portalVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const portalFragment=`varying vec2 vUv;uniform float time;uniform vec3 tint;uniform float active;
    void main(){vec2 p=vUv-.5;float r=length(p*vec2(1.,.55));float a=atan(p.y,p.x);float flow=.5+.5*sin(r*32.-time*.8+a*2.);float fil=.5+.5*sin(p.y*58.+sin(p.x*19.+time*.2)*2.);float edge=pow(abs(p.x)*2.,5.);float beam=exp(-abs(p.x)*18.);float fade=smoothstep(.5,.36,abs(p.x))*smoothstep(.5,.42,abs(p.y));vec3 col=tint*(.07+flow*.11+fil*.025+beam*.23+edge*.2)*(.55+active*.8);gl_FragColor=vec4(col,fade*.85);}`;
  const portalMats=[],gates=[];
  NEXUS_DOORS.forEach((door,index)=>{
    const a=-1.26+index*2.52/7,g=new T.Group();g.position.set(Math.sin(a)*15,0,-Math.cos(a)*15-2);g.rotation.y=-a;hall.add(g);
    const light=glow(door.color,.92),trim=mat(new T.MeshStandardMaterial({color:door.color,metalness:.6,roughness:.3}));
    const points=outline(door.shape).map(([x,y])=>new T.Vector3(x,y,0));
    const curve=new T.CurvePath();for(let i=1;i<points.length;i++)curve.add(new T.LineCurve3(points[i-1],points[i]));
    addMesh(g,geo(new T.TubeGeometry(curve,64,.16,6,false)),metal);
    const inner=addMesh(g,geo(new T.TubeGeometry(curve,64,.025,4,false)),light,0,0,.18);inner.scale.set(.94,.98,1);
    const outer=addMesh(g,geo(new T.TubeGeometry(curve,64,.025,4,false)),trim,0,0,-.18);outer.scale.set(1.13,1.035,1);
    box(g,0,.1,0,3.7,.2,2.1);box(g,0,.23,.2,3.3,.06,1.6,trim);
    for(const side of [-1,1]){
      box(g,side*1.83,2.25,-.13,.22,4.4,.55,black);
      for(let j=0;j<6;j++)box(g,side*1.83,.55+j*.57,.18,.26,.035,.025,trim);
    }
    const pm=mat(new T.ShaderMaterial({vertexShader:portalVertex,fragmentShader:portalFragment,uniforms:{time:{value:0},tint:{value:new T.Color(door.color)},active:{value:0}},transparent:true,side:T.DoubleSide,depthWrite:false}));
    const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x*.91,p.y*.96):shape.moveTo(p.x*.91,p.y*.96));shape.closePath();
    const surface=geo(new T.ShapeGeometry(shape)),uv=surface.attributes.uv,pos=surface.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+1.8)/3.6,pos.getY(i)/5.6);
    addMesh(g,surface,pm,0,.1,-.15);portalMats.push(pm);
    const labelMap=texture(256,64,(c)=>{c.textAlign='center';c.fillStyle='#c5d1d5';c.font='19px monospace';c.fillText(`${String(index+1).padStart(2,'0')}  /  ${door.code}`,128,42);});
    addMesh(g,geo(new T.PlaneGeometry(1.9,.48)),mat(new T.MeshBasicMaterial({map:labelMap,transparent:true})),0,5.85,0);
    const orb=addMesh(g,geo(new T.OctahedronGeometry(.11)),light,0,5.3,.1);
    gates.push({group:g,orb});
  });
  // Ninth gate is physically separate from the eight country thresholds.
  const origin=new T.Group();origin.position.set(0,0,-25);hall.add(origin);
  box(origin,0,3,-.3,4.8,6,.6);for(const s of [-1,1])box(origin,s*2.5,3,0,.12,6.6,.25,gold);
  box(origin,0,6.25,0,5.15,.12,.25,gold);box(origin,0,3,.05,.025,5.5,.05,dimGold);
  const originRing=ring(origin,.68,.055,gold,0,3.1,.1);originRing.rotation.z=.3;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;addMesh(origin,geo(new T.OctahedronGeometry(.09)),dimGold,Math.cos(a)*.95,3.1+Math.sin(a)*.95,.12);}
  // Tall outer ribs give the chamber architectural scale.
  for(let i=0;i<14;i++){const a=-1.6+i*3.2/13;const rib=new T.Group();rib.position.set(Math.sin(a)*22,0,-Math.cos(a)*22-2);rib.rotation.y=-a;hall.add(rib);box(rib,0,5.5,0,.45,11,.6);box(rib,.27,5.5,.35,.018,10,.02,dimGold);}

  const dustPos=new Float32Array(240*3);for(let i=0;i<240;i++){dustPos[i*3]=Math.sin(i*127.1)*25;dustPos[i*3+1]=.5+(i*1.71)%13;dustPos[i*3+2]=Math.cos(i*311.7)*25-5;}
  const dustGeo=geo(new T.BufferGeometry());dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
  const dust=new T.Points(dustGeo,mat(new T.PointsMaterial({size:.028,color:0x9fc8dd,transparent:true,opacity:.58,depthWrite:false})));hall.add(dust);

  // Actual perspective corridor with instanced rings and a cylindrical Matrix skin.
  const tunnelGeom=geo(new T.TorusGeometry(4.4,.032,4,8));
  const frames=new T.InstancedMesh(tunnelGeom,cyan,26);tunnel.add(frames);frames.frustumCulled=false;
  const dummy=new T.Object3D();
  const matrixMap=texture(512,1024,(c,w,h)=>{
    c.fillStyle='#02080e';c.fillRect(0,0,w,h);c.font='16px monospace';
    const letters='3B01HERITAGE';for(let col=0;col<25;col++)for(let row=0;row<51;row++){c.fillStyle=(col+row)%7===0?'#a3ebff':'#164e72';c.fillText(letters[(col*7+row*11)%letters.length],col*21,row*20);}
  });matrixMap.wrapS=matrixMap.wrapT=T.RepeatWrapping;matrixMap.repeat.set(2,5);
  const cylinder=geo(new T.CylinderGeometry(4.6,4.6,115,32,1,true));cylinder.rotateX(Math.PI/2);
  addMesh(tunnel,cylinder,mat(new T.MeshBasicMaterial({map:matrixMap,side:T.BackSide,transparent:true,opacity:.58})),0,0,-50);
  const streakGeometry=geo(new T.BufferGeometry()),streaks=[];
  for(let i=0;i<24;i++){const a=i*Math.PI*2/24;streaks.push(Math.cos(a)*4.3,Math.sin(a)*4.3,5,Math.cos(a)*4.3,Math.sin(a)*4.3,-105);}
  streakGeometry.setAttribute('position',new T.Float32BufferAttribute(streaks,3));tunnel.add(new T.LineSegments(streakGeometry,mat(new T.LineBasicMaterial({color:0x33628b,transparent:true,opacity:.5}))));

  let state={phase:'scan',selected:'FR',overview:true,paused:false,reduced:false,quality:'auto'},dead=false,failed=false,frame=0,last=0,time=0,w=1,h=1,slow=0;
  const position=new T.Vector3(0,5.6,19),target=new T.Vector3(0,3.2,-5),look=new T.Vector3(0,3.2,-5),pointer={x:0,y:0};camera.position.copy(position);
  function size(){w=Math.max(1,canvas.clientWidth);h=Math.max(1,canvas.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();const ratio=state.quality==='fluid'?1:state.quality==='detail'?1.75:w<700?1.25:1.5;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,ratio));renderer.setSize(w,h,false);}
  const observer=new ResizeObserver(size);observer.observe(canvas);size();
  function draw(now){
    if(dead||failed)return;frame=requestAnimationFrame(draw);
    const interval=state.quality==='fluid'||w<700?1000/30:1000/60;
    if(now-last<interval-.5)return;const raw=(now-last)/1000;last=now;const dt=Math.min(raw||.016,.055);
    if(document.hidden)return;
    const moving=!state.reduced&&!state.paused;
    if(moving)time+=dt;
    const passage=state.phase==='tunnel'||state.phase==='scan';tunnel.visible=passage;hall.visible=!passage;
    if(passage){
      camera.position.set(0,0,6);camera.lookAt(0,0,-60);tunnel.rotation.z=moving?Math.sin(time*.17)*.11:0;
      for(let i=0;i<26;i++){dummy.position.set(0,0,6-((i*4.2+time*17)%110));dummy.rotation.z=i*.1+time*.09;dummy.scale.setScalar(1);dummy.updateMatrix();frames.setMatrixAt(i,dummy.matrix);}frames.instanceMatrix.needsUpdate=true;
      matrixMap.offset.y=time*.055;
    }else{
      let selected=NEXUS_DOORS.findIndex(d=>d.code===state.selected);
      if(state.phase==='origin'){position.set(0,3.7,-14);target.set(0,3.2,-25);}
      else if(state.overview||selected<0){position.set(w<600?0:1.6,5.3,w<600?24:19);target.set(0,3.5,-5);}
      else {const gate=gates[selected].group;position.set(gate.position.x+Math.sin(gate.rotation.y)*10.5,3.7,gate.position.z+Math.cos(gate.rotation.y)*10.5);target.set(gate.position.x,2.9,gate.position.z);}
      const mix=state.reduced||state.paused?1:1-Math.exp(-dt*3.8);
      camera.position.lerp(position,mix);look.lerp(target,mix);camera.lookAt(look.x+(moving?pointer.x*.22:0),look.y+(moving?pointer.y*.14:0),look.z);
      core.rotation.y=moving?Math.sin(time*.18)*.13:0;
      pieces.forEach((p,i)=>{p.position.z=((i%3)-1)*.12+(moving?Math.sin(time*.55+i)*.07:0);});
      dust.rotation.y=time*.009;originRing.rotation.z=time*.06;
      portalMats.forEach((m,i)=>{m.uniforms.time.value=time;m.uniforms.active.value=state.overview ? .35 : i===selected ? 1 : 0;});
      gates.forEach((g,i)=>{g.orb.rotation.y=time*.35;});
    }
    try {renderer.render(scene,camera);}catch {failed=true;cancelAnimationFrame(frame);onFailure();}
    // Auto quality only degrades; no oscillating resolution on a warm phone.
    if(state.quality==='auto'&&raw>.047&&raw<.2&&++slow===80)renderer.setPixelRatio(1);
  }
  function lost(event){event.preventDefault();failed=true;cancelAnimationFrame(frame);onFailure();}
  canvas.addEventListener('webglcontextlost',lost);
  frame=requestAnimationFrame(draw);
  return {
    update(next){const q=state.quality;state={...state,...next};if(q!==state.quality)size();},
    pointer(x,y){pointer.x=x;pointer.y=y;},
    destroy(){dead=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();},
  };
} catch { geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();onFailure();return null; }
}
