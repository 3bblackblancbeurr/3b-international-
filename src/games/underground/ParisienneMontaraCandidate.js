import * as THREE from 'three';

export const PARISIENNE_MONTARA_ID='u3b-gm-france-paris';

const physical=(params)=>new THREE.MeshPhysicalMaterial({metalness:.62,roughness:.24,clearcoat:1,clearcoatRoughness:.12,...params});
const addMesh=(parent,geometry,material,name,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
};
const wheel=(role,x,z,materials)=>{
  const root=new THREE.Group();root.name=`wheel_${role}`;root.position.set(x,.38,z);
  addMesh(root,new THREE.TorusGeometry(.34,.105,24,48),materials.tire,`tire_${role}`,[0,0,0],[0,Math.PI/2,0]);
  addMesh(root,new THREE.CylinderGeometry(.225,.225,.115,40,1,false),materials.rim,`rim_${role}`,[0,0,0],[0,0,Math.PI/2]);
  addMesh(root,new THREE.CylinderGeometry(.13,.13,.125,32),materials.rotor,`rotor_${role}`,[0,0,0],[0,0,Math.PI/2]);
  addMesh(root,new THREE.BoxGeometry(.055,.17,.12),materials.caliper,`caliper_${role}`,[role.endsWith('l')?.09:-.09,.02,.02]);
  return root;
};

export function isParisienneMontaraCandidate(vehicle){
  return vehicle?.productionRef===PARISIENNE_MONTARA_ID||vehicle?.id===PARISIENNE_MONTARA_ID;
}

export function createParisienneMontaraCandidate(){
  const root=new THREE.Group();root.name='U3B_Parisienne_Montara_GoldCandidate';
  const materials={
    body:physical({color:0x11151c,metalness:.78,roughness:.17,clearcoat:1,clearcoatRoughness:.08}),
    body2:physical({color:0x1f2b42,metalness:.72,roughness:.2}),
    gold:physical({color:0xd6b66a,metalness:.96,roughness:.16,clearcoat:.75}),
    carbon:physical({color:0x090a0d,metalness:.55,roughness:.28}),
    glass:physical({color:0x14243b,metalness:.1,roughness:.08,transmission:.52,transparent:true,opacity:.72,ior:1.48}),
    tire:physical({color:0x050506,metalness:.02,roughness:.92,clearcoat:0}),
    rim:physical({color:0x171a20,metalness:.95,roughness:.15}),
    rotor:physical({color:0x737982,metalness:.9,roughness:.32}),
    caliper:physical({color:0xd7b76b,metalness:.72,roughness:.2}),
    light:physical({color:0xdcecff,emissive:0x8fc7ff,emissiveIntensity:4.5,metalness:.05,roughness:.12}),
    rearLight:physical({color:0x6c0612,emissive:0xff1738,emissiveIntensity:3.8,metalness:.04,roughness:.15}),
    interior:physical({color:0x0a0b0f,metalness:.12,roughness:.5}),
    screen:physical({color:0x08131f,emissive:0x1d78ff,emissiveIntensity:2.2,metalness:.2,roughness:.18}),
  };

  addMesh(root,new THREE.BoxGeometry(1.86,.42,4.18),materials.body,'body_main',[0,.55,0]);
  addMesh(root,new THREE.BoxGeometry(1.72,.24,1.42),materials.body2,'hood',[0,.79,-1.25],[-.045,0,0]);
  addMesh(root,new THREE.BoxGeometry(1.72,.20,1.16),materials.body2,'rear_deck',[0,.80,1.36],[.035,0,0]);
  addMesh(root,new THREE.BoxGeometry(1.58,.62,1.82),materials.glass,'cabin_glass',[0,1.03,.08]);
  addMesh(root,new THREE.BoxGeometry(1.66,.10,1.95),materials.body,'roof',[0,1.38,.08]);
  addMesh(root,new THREE.BoxGeometry(.09,.42,1.72),materials.gold,'left_signature',[-.94,.61,.08]);
  addMesh(root,new THREE.BoxGeometry(.09,.42,1.72),materials.gold,'right_signature',[.94,.61,.08]);
  addMesh(root,new THREE.BoxGeometry(1.64,.17,.26),materials.carbon,'front_splitter',[0,.30,-2.13]);
  addMesh(root,new THREE.BoxGeometry(1.68,.16,.30),materials.carbon,'rear_diffuser',[0,.30,2.11]);
  addMesh(root,new THREE.BoxGeometry(1.48,.07,.34),materials.gold,'rear_spoiler',[0,1.06,1.86]);
  addMesh(root,new THREE.BoxGeometry(.07,.23,.42),materials.gold,'spoiler_left',[-.58,.92,1.76]);
  addMesh(root,new THREE.BoxGeometry(.07,.23,.42),materials.gold,'spoiler_right',[.58,.92,1.76]);
  addMesh(root,new THREE.BoxGeometry(.58,.13,.08),materials.light,'headlamp_left',[-.50,.72,-2.12]);
  addMesh(root,new THREE.BoxGeometry(.58,.13,.08),materials.light,'headlamp_right',[.50,.72,-2.12]);
  addMesh(root,new THREE.BoxGeometry(.62,.11,.08),materials.rearLight,'taillamp_left',[-.48,.72,2.12]);
  addMesh(root,new THREE.BoxGeometry(.62,.11,.08),materials.rearLight,'taillamp_right',[.48,.72,2.12]);

  const cockpit=new THREE.Group();cockpit.name='cockpit';
  addMesh(cockpit,new THREE.BoxGeometry(1.36,.12,.48),materials.interior,'dashboard',[0,.94,-.58]);
  addMesh(cockpit,new THREE.BoxGeometry(.34,.42,.42),materials.interior,'seat_left',[-.38,.72,.20]);
  addMesh(cockpit,new THREE.BoxGeometry(.34,.42,.42),materials.interior,'seat_right',[.38,.72,.20]);
  addMesh(cockpit,new THREE.TorusGeometry(.18,.025,16,32),materials.gold,'steering_wheel',[-.36,.96,-.48],[Math.PI/2,0,0]);
  addMesh(cockpit,new THREE.BoxGeometry(.48,.18,.03),materials.screen,'matrix_display',[0,.96,-.82]);
  root.add(cockpit);

  const wheelRoles={fl:wheel('fl',-.82,-1.34,materials),fr:wheel('fr',.82,-1.34,materials),rl:wheel('rl',-.82,1.34,materials),rr:wheel('rr',.82,1.34,materials)};
  Object.values(wheelRoles).forEach(w=>root.add(w));

  const plate=addMesh(root,new THREE.BoxGeometry(.52,.16,.025),materials.gold,'plate_3b',[0,.48,2.19]);
  plate.userData.text='3B PARIS';

  root.userData.productionCandidate=true;
  root.userData.vehicleId=PARISIENNE_MONTARA_ID;
  root.userData.wheelRoles=wheelRoles;
  root.userData.candidateGate={finalArt:false,realAsset:true,pbr:true,cockpit:true,wheelsSeparated:true,lods:false,collision:false,capture60fps:false,qa:false};
  return root;
}
