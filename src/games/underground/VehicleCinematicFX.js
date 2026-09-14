import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function attachVehicleCinematicFX(root,{ai=false,accent='#ff203c'}={}){
  const fx=new THREE.Group();fx.name='U3B_VehicleCinematicFX';fx.userData={trailMaterials:[],beamMaterials:[],reflectionMaterials:[]};
  const trailMat=new THREE.MeshBasicMaterial({color:new THREE.Color(ai?'#ff3448':accent),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  for(const x of [-.58,.58]){const trail=new THREE.Mesh(new THREE.BoxGeometry(.13,.035,2.8),trailMat.clone());trail.position.set(x,.72,3.42);trail.userData.baseZ=3.42;fx.userData.trailMaterials.push(trail.material);fx.add(trail);}
  const beamMat=new THREE.MeshBasicMaterial({color:0xdcecff,transparent:true,opacity:ai?.018:.028,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  for(const x of [-.55,.55]){const beam=new THREE.Mesh(new THREE.ConeGeometry(.92,7.5,18,1,true),beamMat.clone());beam.rotation.x=-Math.PI/2;beam.position.set(x,.72,-5.45);beam.scale.x=.62;fx.userData.beamMaterials.push(beam.material);fx.add(beam);}
  const reflectMat=new THREE.MeshBasicMaterial({color:new THREE.Color(ai?'#9c1727':'#d7b76b'),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const reflection=new THREE.Mesh(new THREE.PlaneGeometry(1.9,4.1),reflectMat);reflection.rotation.x=-Math.PI/2;reflection.position.y=-.17;reflection.position.z=.18;fx.userData.reflectionMaterials.push(reflectMat);fx.add(reflection);
  root.add(fx);root.userData.cinematicFX=fx;return fx;
}

export function updateVehicleCinematicFX(root,{speedKph=0,wetness=.6,brake=0,time=0}={}){
  const fx=root?.userData?.cinematicFX;if(!fx)return;const speed=clamp((speedKph-70)/220),wet=clamp(wetness),br=clamp(brake);
  fx.userData.trailMaterials.forEach((m,i)=>{m.opacity=(.025+.22*speed)*(.55+.45*wet)+br*.08;m.color.offsetHSL(0,0,.002*Math.sin(time*2+i));});
  fx.userData.beamMaterials.forEach(m=>{m.opacity=.012+.045*(1-speed*.35);});
  fx.userData.reflectionMaterials.forEach(m=>{m.opacity=(.025+.105*wet)*(1+.12*Math.sin(time*1.7));});
  for(const child of fx.children)if(child.geometry?.type==='BoxGeometry'){child.scale.z=.55+1.35*speed;child.position.z=(child.userData.baseZ||3.42)+1.2*speed;}
}
