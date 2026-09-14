import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function gradientTexture(w=64,h=16,{radial=false}={}){
  const data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,u=x/(w-1),v=y/(h-1);let a;if(radial){const dx=(u-.5)/.5,dy=(v-.5)/.5,d=Math.sqrt(dx*dx+dy*dy);a=Math.max(0,1-d);a*=a;}else{a=Math.pow(1-v,2.2)*(1-Math.abs(u-.5)*1.35);}data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=Math.round(255*clamp(a));
  }const tex=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);tex.needsUpdate=true;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearFilter;return tex;
}

export function attachVehicleCinematicFX(root,{ai=false,accent='#ff203c'}={}){
  const fx=new THREE.Group();fx.name='U3B_VehicleCinematicFX';fx.userData={trailMaterials:[],reflectionMaterials:[],trailMeshes:[],textures:[]};
  const trailTexture=gradientTexture(48,128),reflectionTexture=gradientTexture(96,64,{radial:true});fx.userData.textures.push(trailTexture,reflectionTexture);
  for(const x of [-.58,.58]){
    const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(ai?'#ff3448':accent),map:trailTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const trail=new THREE.Mesh(new THREE.PlaneGeometry(.28,3.8),mat);trail.rotation.x=-Math.PI/2;trail.position.set(x,.705,3.1);trail.userData.baseZ=3.1;fx.userData.trailMaterials.push(mat);fx.userData.trailMeshes.push(trail);fx.add(trail);
  }
  const reflectMat=new THREE.MeshBasicMaterial({color:new THREE.Color(ai?'#7c1420':'#c8a45b'),map:reflectionTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const reflection=new THREE.Mesh(new THREE.PlaneGeometry(2.05,3.55),reflectMat);reflection.rotation.x=-Math.PI/2;reflection.position.y=.06;reflection.position.z=.15;fx.userData.reflectionMaterials.push(reflectMat);fx.add(reflection);
  root.add(fx);root.userData.cinematicFX=fx;return fx;
}

export function updateVehicleCinematicFX(root,{speedKph=0,wetness=.6,brake=0,time=0}={}){
  const fx=root?.userData?.cinematicFX;if(!fx)return;const speed=clamp((speedKph-80)/220),wet=clamp(wetness),br=clamp(brake);
  fx.userData.trailMaterials.forEach((m,i)=>{m.opacity=(.018+.11*speed)*(.48+.52*wet)+br*.035;m.opacity*=.97+.03*Math.sin(time*2+i);});
  fx.userData.reflectionMaterials.forEach(m=>{m.opacity=(.012+.045*wet)*(1+.08*Math.sin(time*1.7));});
  fx.userData.trailMeshes.forEach((trail,i)=>{trail.scale.y=.55+1.25*speed;trail.position.z=(trail.userData.baseZ||3.1)+1.05*speed+i*.01;});
}
