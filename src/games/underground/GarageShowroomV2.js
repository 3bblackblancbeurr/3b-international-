import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Runtime values are Three.js intensities, NOT Unreal EV or unitless 18,000.
// The supplied lighting brief defines placement; exposure is a linear multiplier.
export const GARAGE_LIGHTING = Object.freeze({
  exposure:1.35, environmentIntensity:1.65, hemisphere:1.3,
  key:{position:[-1.4,2.8,-3.2],target:[0,.8,-.3],width:2.4,height:1.2,intensity:18,color:0xfff3e1},
  left:{position:[-2.8,2.2,-.6],target:[0,.7,0],width:1.8,height:1,intensity:9.5,color:0xe6efff},
  right:{position:[2.8,2.2,.3],target:[0,.7,0],width:1.8,height:1,intensity:8.8,color:0xe0ebff},
  rim:{position:[.4,2.4,3.4],target:[0,.9,.5],width:2.4,height:1.2,intensity:7.2,color:0xc6dcff},
  top:{height:4.1,width:4.5,depth:.35,intensity:11.5,z:[-1.4,0,1.4]},
});
export const GARAGE_PALETTE = Object.freeze({blue:0x2d7bff,wall:0x59616c,metal:0x202630,floor:0x414956});
export const GARAGE_INVENTORY = Object.freeze([
  'murs et plafond','porte sectionnelle','LED plafond','cloison vitrée',
  'établi','servante à outils','armoires','outils suspendus','présentoir jantes',
  'pneus performance','compresseur','station diagnostic','écrans muraux',
  'disques et étriers','volant sport','rangement detailing','extincteur',
  'casier','ventilation','enseigne 3B Underground',
]);

function labelTexture(title,subtitle='',size=1024){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size/2;
  const c=canvas.getContext('2d');if(!c)return null;
  c.fillStyle='#0b1420';c.fillRect(0,0,size,size/2);
  c.fillStyle='#2d7bff';c.fillRect(size*.06,size*.075,size*.035,size*.35);
  c.fillStyle='#f5f8ff';c.font=`700 ${Math.round(size*.095)}px sans-serif`;
  c.fillText(title,size*.13,size*.225,size*.81);
  c.fillStyle='#a7c8fa';c.font=`500 ${Math.round(size*.036)}px sans-serif`;
  c.fillText(subtitle,size*.13,size*.30,size*.80);
  c.strokeStyle='#2d7bff';c.lineWidth=size*.002;
  for(let i=0;i<5;i++){c.beginPath();c.moveTo(size*.13,size*(.355+i*.016));c.lineTo(size*(.87-i*.045),size*(.355+i*.016));c.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

// Merge static primitives by material/shadow flags. No textures/models downloaded.
function batchStatic(root){
  root.updateMatrixWorld(true);
  const batches=new Map(),originals=[],sourceGeometry=new Set();
  root.traverse(o=>{
    if(!o.isMesh||!o.userData.batch||Array.isArray(o.material))return;
    const key=`${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
    if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,geometry:[]});
    let g=o.geometry.clone();if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}
    g.applyMatrix4(o.matrixWorld);batches.get(key).geometry.push(g);originals.push(o);sourceGeometry.add(o.geometry);
  });
  for(const batch of batches.values()){
    const geometry=mergeGeometries(batch.geometry,false);batch.geometry.forEach(g=>g.dispose());
    if(!geometry)throw new Error('Garage: impossible de regrouper les géométries.');
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.name='garage_static_batch';
    mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;root.add(mesh);
  }
  originals.forEach(o=>o.removeFromParent());sourceGeometry.forEach(g=>g.dispose());
}

export function createGarageShowroom({labels=true}={}){
  const root=new THREE.Group();root.name='3B_ModernGarage_V2';
  const textures=[];const material=(color,roughness=.55,metalness=.12)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const M={wall:material(GARAGE_PALETTE.wall,.8,.04),dark:material(GARAGE_PALETTE.metal,.42,.5),
    frame:material(0x101821,.38,.5),steel:material(0x98a4b2,.26,.82),rubber:material(0x171b20,.87,.01),
    red:material(0xb52c38,.4,.25),blue:material(0x225ec4,.42,.25),white:material(0xd9e0eb,.5,.08),
    led:new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xeaf2ff,emissiveIntensity:4,roughness:.35}),
    neon:new THREE.MeshStandardMaterial({color:GARAGE_PALETTE.blue,emissive:GARAGE_PALETTE.blue,emissiveIntensity:2.5}),
    glass:new THREE.MeshPhysicalMaterial({color:0xb6cce4,metalness:.05,roughness:.12,transparent:true,opacity:.22,depthWrite:false})};
  const geometries=new Map();
  const geo=(id,fn)=>{if(!geometries.has(id))geometries.set(id,fn());return geometries.get(id);};
  const boxGeo=()=>geo('box',()=>new THREE.BoxGeometry(1,1,1));
  function item(name){const group=new THREE.Group();group.name=name;root.add(group);return group;}
  function mesh(parent,g,m,name,pos,scale=[1,1,1],rot=[0,0,0],shadow=true){
    const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rot);
    o.castShadow=shadow;o.receiveShadow=shadow;o.userData.batch=m!==M.glass;parent.add(o);return o;
  }
  const box=(p,m,n,at,scale,rot,shadow)=>mesh(p,boxGeo(),m,n,at,scale,rot,shadow);
  const cylinder=(p,m,n,at,r,h,rot=[0,0,0])=>mesh(p,geo('cylinder',()=>new THREE.CylinderGeometry(1,1,1,16)),m,n,at,[r,h,r],rot);
  function screen(parent,title,subtitle,at,width,height,rotation=0){
    box(parent,M.frame,'screen_frame',at,[width+.08,height+.08,.08],[0,rotation,0]);
    const tex=labels?labelTexture(title,subtitle):null;if(tex)textures.push(tex);
    const mat=new THREE.MeshBasicMaterial({color:0xffffff,map:tex,toneMapped:false,side:THREE.DoubleSide});
    mesh(parent,new THREE.PlaneGeometry(width,height),mat,'screen',
      [at[0]+Math.sin(rotation)*.052,at[1],at[2]+Math.cos(rotation)*.052],[1,1,1],[0,rotation,0],false);
  }
  const architecture=item('garage_architecture');
  const floorMaterial=new THREE.MeshPhysicalMaterial({color:GARAGE_PALETTE.floor,roughness:.26,metalness:.02,clearcoat:.3,clearcoatRoughness:.32,specularIntensity:.55});
  const floor=box(architecture,floorMaterial,'garage_floor',[0,-.07,0],[18,.12,17]);floor.userData.batch=false;
  box(architecture,M.wall,'back_wall',[0,2.4,8.35],[18,4.8,.18]);
  box(architecture,M.wall,'front_wall',[0,2.4,-8.35],[18,4.8,.18]);
  box(architecture,M.frame,'exit_frame',[0,1.7,-8.20],[5.6,3.4,.1]);
  for(let i=0;i<7;i++)box(architecture,M.steel,'exit_panel',[0,.3+i*.45,-8.10],[5.3,.4,.06]);
  screen(architecture,'3B UNDERGROUND','SORTIE  /  FRANCE',[0,3.95,-8.1],3.8,.8,0);
  box(architecture,M.wall,'left_wall',[-9,2.4,0],[.18,4.8,17]);
  box(architecture,M.wall,'right_wall',[9,2.4,0],[.18,4.8,17]);
  box(architecture,M.dark,'ceiling',[0,4.8,0],[18,.15,17]);
  for(const x of [-8.2,-5.4,-2.7,0,2.7,5.4,8.2])box(architecture,M.frame,'wall_seam',[x,2.25,8.22],[.035,4.4,.025]);
  for(const z of [-5,-1,3,7])box(architecture,M.frame,'ceiling_beam',[0,4.57,z],[18,.23,.16]);
  for(const x of [-8.88,8.88]){
    box(architecture,M.dark,'lower_wall',[x,.6,0],[.04,1.15,17]);
    box(architecture,M.neon,'wall_blue_line',[x,1.21,0],[.045,.035,16.8],undefined,false);
  }
  const door=item('garage_sectional_door');
  box(door,M.frame,'door_frame',[5.7,1.8,8.18],[4.2,3.6,.16]);
  for(let i=0;i<8;i++)box(door,M.steel,'door_panel',[5.7,.27+i*.42,8.06],[3.88,.38,.08]);
  box(door,M.dark,'door_handle',[5.7,1.13,7.97],[.65,.05,.08]);
  screen(architecture,'3B UNDERGROUND','ATELIER 01  /  FRANCE',[-.7,2.9,8.13],5.6,2.0,Math.PI);
  const window=item('garage_glass_partition');
  box(window,M.glass,'glass',[-6.5,2.55,8.09],[3.1,2.7,.04]);
  for(const x of [-8.08,-6.5,-4.92])box(window,M.steel,'mullion',[x,2.55,8.01],[.035,2.8,.04]);
  const bay=item('garage_clear_vehicle_bay');
  for(const x of [-2.55,2.55])box(bay,M.white,'bay_marking',[x,.007,0],[.045,.007,5.8],undefined,false);
  for(const z of [-2.9,2.9])box(bay,M.white,'bay_end',[0,.007,z],[5.14,.007,.045],undefined,false);
  for(const x of [-2.7,2.7])box(bay,M.neon,'blue_floor_strip',[x,.009,0],[.027,.01,5.9],undefined,false);
  for(const x of [-6,-3,0,3,6])box(bay,M.dark,'floor_expansion',[x,.003,0],[.009,.002,16],undefined,false);
  const ceiling=item('garage_led_fixtures');
  for(const z of GARAGE_LIGHTING.top.z){
    box(ceiling,M.frame,'led_housing',[0,4.17,z],[4.7,.10,.47]);
    box(ceiling,M.led,'led_diffuser',[0,4.10,z],[4.5,.015,.35],undefined,false);
    for(const x of [-1.9,1.9])cylinder(ceiling,M.steel,'led_hanger',[x,4.44,z],.009,.44);
  }
  for(const x of [-5.7,5.7])box(ceiling,M.led,'side_led',[x,4.18,2],[.16,.025,7],undefined,false);
  const bench=item('garage_workbench');
  box(bench,M.dark,'bench_cabinet',[-5.6,.46,5.75],[4.6,.92,.92]);
  box(bench,M.steel,'bench_worktop',[-5.6,.96,5.75],[4.8,.09,1]);
  for(let i=0;i<6;i++){
    box(bench,M.frame,'bench_door',[-7.52+i*.77,.48,5.25],[.71,.78,.035]);
    box(bench,M.steel,'bench_handle',[-7.52+i*.77,.77,5.21],[.4,.022,.02]);
  }
  box(bench,M.dark,'pegboard',[-5.6,1.8,6.3],[4.7,1.45,.08]);
  for(let i=0;i<9;i++){
    box(bench,M.steel,'hanging_tool',[-7.2+i*.38,1.87,6.23],[.025,.32+(i%3)*.07,.035],[0,0,(i%2)*.13]);
    cylinder(bench,M.steel,'tool_head',[-7.2+i*.38,2.08,6.22],.062,.025,[Math.PI/2,0,0]);
  }
  box(bench,M.led,'bench_light',[-5.6,2.58,6.2],[4.6,.045,.045],undefined,false);
  const cart=item('garage_tool_cart');
  box(cart,M.blue,'cart_body',[-4.4,.54,1.8],[1.22,.89,.64]);
  box(cart,M.steel,'cart_top',[-4.4,1.02,1.8],[1.3,.08,.7]);
  for(let i=0;i<5;i++)box(cart,M.steel,'drawer_handle',[-4.4,.3+i*.14,1.46],[.95,.019,.03]);
  for(const x of [-4.88,-3.92])for(const z of [1.56,2.04])cylinder(cart,M.rubber,'caster',[x,.13,z],.105,.08,[Math.PI/2,0,0]);
  const cabinets=item('garage_storage_cabinets');
  for(let i=0;i<3;i++){
    box(cabinets,M.dark,'cabinet',[3.3+i*.8,1.03,6.9],[.75,2.06,.7]);
    box(cabinets,M.steel,'cabinet_handle',[3.52+i*.8,1.03,6.52],[.025,.28,.035]);
    for(let j=0;j<5;j++)box(cabinets,M.frame,'cabinet_vent',[3.3+i*.8,.23+j*.04,6.52],[.48,.012,.013]);
  }
  const wheels=item('garage_wheel_display');
  for(let i=0;i<3;i++){
    const x=3.5+i*1.08;
    mesh(wheels,geo('rim',()=>new THREE.TorusGeometry(.34,.042,8,28)),M.steel,'display_rim',[x,3.3,7.9]);
    cylinder(wheels,M.steel,'wheel_hub',[x,3.3,7.9],.075,.06,[Math.PI/2,0,0]);
    for(let j=0;j<5;j++)box(wheels,M.steel,'wheel_spoke',[x+Math.sin(j*1.256)*.14,3.3+Math.cos(j*1.256)*.14,7.9],[.04,.30,.035],[0,0,-j*1.256]);
  }
  const tires=item('garage_performance_tires');
  for(let i=0;i<4;i++)mesh(tires,geo('tire',()=>new THREE.TorusGeometry(.36,.115,10,28)),M.rubber,'tire',[5.45,.14+i*.24,2.9],[1,1,1],[Math.PI/2,0,0]);
  const compressor=item('garage_compressor');
  cylinder(compressor,M.red,'compressor_tank',[-7,.42,2.9],.32,1.08,[0,0,Math.PI/2]);
  box(compressor,M.dark,'compressor_motor',[-7,.82,2.9],[.46,.32,.4]);
  for(const x of [-7.36,-6.64])cylinder(compressor,M.rubber,'compressor_wheel',[x,.16,2.78],.13,.1,[Math.PI/2,0,0]);
  const diagnostic=item('garage_diagnostic_station');
  box(diagnostic,M.dark,'diagnostic_base',[4.3,.15,-.2],[.9,.12,.65]);
  box(diagnostic,M.steel,'diagnostic_stand',[4.3,.82,-.2],[.1,1.3,.1]);
  screen(diagnostic,'DIAGNOSTIC','3B  /  VEHICULE',[4.3,1.6,-.2],1.25,.68,Math.PI);
  screen(bench,'CUSTOM LAB','PEINTURE  /  JANTES  /  REGLAGES',[-4,1.5,5.62],1.28,.66,Math.PI);
  screen(architecture,'ATELIER 01','PREPARATION  /  INSPECTION',[-6.6,3.4,8.0],1.8,.9,Math.PI);
  const parts=item('garage_parts_detailing');
  for(let i=0;i<4;i++){
    cylinder(parts,i%2?M.white:M.blue,'detailing_bottle',[-7+i*.23,1.15,5.7],.055,.29);
    cylinder(parts,M.frame,'bottle_cap',[-7+i*.23,1.315,5.7],.038,.055);
  }
  cylinder(parts,M.steel,'brake_disc',[-5.35,1.04,5.7],.23,.03);
  box(parts,M.red,'brake_caliper',[-5.14,1.1,5.7],[.12,.1,.25]);
  mesh(parts,geo('steering_wheel',()=>new THREE.TorusGeometry(.2,.029,8,24)),M.rubber,'sports_steering',[-6,1.16,5.8],[1,1,1],[.7,0,0]);
  const safety=item('garage_safety');
  cylinder(safety,M.red,'extinguisher',[7.9,.82,7.9],.12,.54);
  box(safety,M.steel,'extinguisher_handle',[7.9,1.13,7.9],[.18,.04,.09]);
  box(safety,M.white,'extinguisher_label',[7.9,.85,7.77],[.15,.18,.012]);
  for(let i=0;i<7;i++)box(safety,M.steel,'vent_blade',[-2.9,4.01+i*.07,8.18],[1.2,.025,.1]);
  root.userData.inventory=[...GARAGE_INVENTORY];batchStatic(root);
  let disposed=false;root.userData.dispose=()=>{if(disposed)return;disposed=true;const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());};
  return root;
}

export function addGarageLighting(scene){
  const rig=new THREE.Group();rig.name='garage_lighting';
  rig.add(new THREE.HemisphereLight(0xedf4ff,0x8794aa,GARAGE_LIGHTING.hemisphere));
  function area(name,config){const light=new THREE.RectAreaLight(config.color,config.intensity,config.width,config.height);light.name=name;light.position.set(...config.position);light.lookAt(...config.target);rig.add(light);return light;}
  for(const name of ['key','left','right','rim'])area(`garage_${name}`,GARAGE_LIGHTING[name]);
  GARAGE_LIGHTING.top.z.forEach((z,i)=>area(`garage_top_${i}`,{position:[0,4.1,z],target:[0,.7,z],width:4.5,height:.35,intensity:11.5,color:0xfff8ed}));
  // RectAreaLight has no shadows. One bounded directional shadow anchors the car.
  const shadow=new THREE.DirectionalLight(0xfff5e8,1.4);shadow.name='garage_contact_key';shadow.position.set(-3.5,6,-4);shadow.castShadow=true;
  shadow.shadow.mapSize.set(1024,1024);Object.assign(shadow.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:24});shadow.shadow.bias=-.00015;shadow.shadow.normalBias=.02;rig.add(shadow,shadow.target);scene.add(rig);return rig;
}
