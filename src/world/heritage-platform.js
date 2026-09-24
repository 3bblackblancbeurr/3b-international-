import * as THREE from 'three';
/**
 * Premium ceremonial heart for the Cité des Huit Héritages.
 *
 * The platform intentionally stays almost flush with the navigation surface:
 * it reads as a monumental place without introducing a second collision deck
 * or breaking the existing pathfinder.
 */
export function addHeritagePlatform({root,shape,geo,mat,height,owned,center}){
 const staticRoot=new THREE.Group(),dynamicRoot=new THREE.Group();
 staticRoot.name='3B-Heritage-Platform';dynamicRoot.name='3B-Heritage-Platform-Dynamic';
 root.add(staticRoot,dynamicRoot);
 const y=height(center.x,center.z);
 const physical=(options)=>{const m=new THREE.MeshPhysicalMaterial(options);owned.push(m);return m;};
 const obsidian=physical({color:'#070b10',roughness:.38,metalness:.28,clearcoat:.32,clearcoatRoughness:.26});
 const stone=physical({color:'#151d24',roughness:.58,metalness:.12,clearcoat:.12});
 const champagne=physical({color:'#d6b46a',roughness:.28,metalness:.82,clearcoat:.55,clearcoatRoughness:.18});
 const glass=physical({color:'#071a27',roughness:.18,metalness:.18,transmission:.12,transparent:true,opacity:.88,emissive:'#009cff',emissiveIntensity:.15,depthWrite:true});
 const blue=physical({color:'#0a6fa6',roughness:.22,metalness:.45,emissive:'#00a8ff',emissiveIntensity:.82,clearcoat:.42});
 const box=geo(new THREE.BoxGeometry(1,1,1));
 const cylinder=geo(new THREE.CylinderGeometry(1,1,1,8));
 const fineCylinder=geo(new THREE.CylinderGeometry(1,1,1,16));
 const ring=(radius,tube=.055,segments=96)=>geo(new THREE.TorusGeometry(radius,tube,8,segments));

 // Three shallow octagonal tiers. They are deliberately low enough that the
 // player remains on the canonical terrain/collision plane.
 shape(cylinder,stone,center.x,y+.045,center.z,31,.09,31,staticRoot);
 shape(cylinder,obsidian,center.x,y+.105,center.z,23.6,.12,23.6,staticRoot);
 shape(cylinder,stone,center.x,y+.17,center.z,10.2,.13,10.2,staticRoot);

 // Champagne-metal perimeter and concentric wayfinding rings.
 for(const [radius,tube,lift] of [[31,.12,.10],[23.6,.075,.18],[10.2,.085,.25],[6.1,.055,.28]]){
  const rim=shape(ring(radius,tube),champagne,center.x,y+lift,center.z,1,1,1,staticRoot);rim.rotation.x=Math.PI/2;rim.castShadow=false;
 }

 // The heart is civic, not a wheel of country gates. The actual eight
 // country Portes live on the outer metropolis ring. Here we keep only six
 // broad city axes linking the Place de l’Héritage to useful districts.
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,dirX=Math.sin(a),dirZ=Math.cos(a),mid=17.1;
  const ribbon=shape(box,glass,center.x+dirX*mid,y+.205,center.z+dirZ*mid,1.55,.028,13.2,staticRoot);ribbon.rotation.y=a;
  const pulse=shape(box,blue,center.x+dirX*mid,y+.235,center.z+dirZ*mid,.065,.018,12.7,staticRoot);pulse.rotation.y=a;pulse.castShadow=false;
  const px=center.x+dirX*28.4,pz=center.z+dirZ*28.4;
  const landing=shape(cylinder,obsidian,px,y+.20,pz,2.5,.26,2.5,staticRoot);landing.rotation.y=Math.PI/8;
  const rim=shape(cylinder,champagne,px,y+.36,pz,2.05,.045,2.05,staticRoot);rim.rotation.y=Math.PI/8;rim.castShadow=false;
 }

 // Four monumental civic thresholds frame the Place without pretending that
 // the countries are here. They are orientation landmarks toward the wider city.
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,dirX=Math.sin(a),dirZ=Math.cos(a),sideX=Math.cos(a),sideZ=-Math.sin(a);
  const px=center.x+dirX*35,pz=center.z+dirZ*35;
  const apron=shape(box,obsidian,px,y+.055,pz,7.2,.07,6.2,staticRoot);apron.rotation.y=a;
  for(const side of [-1,1]){
   const bx=px+sideX*side*3.0,bz=pz+sideZ*side*3.0;
   shape(fineCylinder,champagne,bx,y+1.05,bz,.12,2.0,.12,staticRoot);
   const cap=shape(fineCylinder,blue,bx,y+2.12,bz,.19,.14,.19,staticRoot);cap.castShadow=false;
  }
 }

 // Central "broken circle": three incomplete vertical arcs, a black-gold
 // pedestal and a restrained energy core. This becomes the skyline signature
 // of the platform while remaining light enough for mobile.
 shape(cylinder,obsidian,center.x,y+.66,center.z,5.7,1.05,5.7,staticRoot);
 shape(cylinder,champagne,center.x,y+1.22,center.z,4.55,.10,4.55,staticRoot);
 const arcMat=champagne;
 for(let i=0;i<3;i++){
  const arc=shape(geo(new THREE.TorusGeometry(4.25+i*.26,.095,8,72,Math.PI*1.56)),arcMat,center.x,y+5.55,center.z,1,1,1,dynamicRoot);
  arc.rotation.set(Math.PI/2,i*Math.PI/3+.15,.25+i*.22);
  arc.userData.phase=i*2.1;
 }
 const core=shape(geo(new THREE.IcosahedronGeometry(1,2)),blue,center.x,y+5.45,center.z,1.05,1.4,1.05,dynamicRoot);
 const halo=shape(ring(2.0,.045,72),glass,center.x,y+5.45,center.z,1,1,1,dynamicRoot);halo.rotation.x=Math.PI/2;
 const crown=shape(ring(3.05,.035,72),blue,center.x,y+5.45,center.z,1,1,1,dynamicRoot);crown.rotation.y=Math.PI/2;

 return{
  staticRoot,
  dynamicRoot,
  tick(time){
   core.rotation.y=time*.24;core.rotation.x=.18+Math.sin(time*.32)*.05;
   core.position.y=y+5.45+Math.sin(time*.8)*.13;
   halo.rotation.z=time*.11;crown.rotation.x=time*.08;
   for(const child of dynamicRoot.children)if(child.userData.phase!==undefined)child.rotation.z=.25+Math.sin(time*.22+child.userData.phase)*.055;
  },
 };
}
