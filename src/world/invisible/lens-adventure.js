import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {goldMasterTokens,worldRealmArt,worldArtMaterials,worldCrowdPalette,worldCartographyArt} from '../../design-system/tokens.js';

// These are original stage designs, not reconstructions of monuments or walking routes.
const realmLooks={
 france:{arch:'round',trees:'broad',skin:4,hair:worldCrowdPalette.cloth[0],hairStyle:'long',cape:true},
 algerie:{arch:'point',trees:'slender',skin:3,hair:worldCrowdPalette.cloth[7],hairStyle:'braid',cape:false},
 maroc:{arch:'point',trees:'slender',skin:2,hair:worldCrowdPalette.cloth[0],hairStyle:'short',cape:true},
 tunisie:{arch:'wide',trees:'slender',skin:3,hair:worldCrowdPalette.cloth[7],hairStyle:'curls',cape:true},
 espagne:{arch:'wide',trees:'broad',skin:3,hair:worldCrowdPalette.cloth[3],hairStyle:'short',cape:false},
 italie:{arch:'round',trees:'column',skin:4,hair:worldCrowdPalette.cloth[3],hairStyle:'wave',cape:true},
 turquie:{arch:'point',trees:'column',skin:3,hair:worldCrowdPalette.cloth[0],hairStyle:'knot',cape:true},
 estonie:{arch:'angular',trees:'fir',skin:5,hair:worldRealmArt.estonie.stone,hairStyle:'bob',cape:true},
};

export function createLensAdventure(episode){
 const realmId=episode.fragment?.realm||episode.realm||'france',realm=worldRealmArt[realmId]||worldRealmArt.france,look=realmLooks[realmId]||realmLooks.france,palette=goldMasterTokens.colors;
 const content=new THREE.Group(),environment=new THREE.Group(),objects=new Map(),animations=[],geometries=new Set(),materials=new Set(),textures=new Set();
 content.name='invisible-artifacts';environment.name='fictional-public-quay';
 const tint=(a,b,amount)=>new THREE.Color(a).lerp(new THREE.Color(b),amount);
 const duskTop=tint(realm.night,palette.matrix,.065),duskHorizon=tint(realm.fog,realm.night,.57),skyPixels=new Uint8Array(64*4);
 for(let i=0;i<64;i++){const color=duskHorizon.clone().lerp(duskTop,Math.pow(i/63,.65));skyPixels.set([Math.round(color.r*255),Math.round(color.g*255),Math.round(color.b*255),255],i*4);}
 const background=new THREE.DataTexture(skyPixels,1,64,THREE.RGBAFormat);background.colorSpace=THREE.LinearSRGBColorSpace;background.magFilter=THREE.LinearFilter;background.minFilter=THREE.LinearFilter;background.needsUpdate=true;textures.add(background);
 function material(options){const value=new THREE.MeshStandardMaterial(options);materials.add(value);return value;}
 function basic(options){const value=new THREE.MeshBasicMaterial(options);materials.add(value);return value;}
 function geometry(value){geometries.add(value);return value;}
 function mesh(shape,surface,parent,x=0,y=0,z=0){const value=new THREE.Mesh(geometry(shape),surface);value.position.set(x,y,z);parent.add(value);return value;}
 function instances(shape,surface,parent,placements){const value=new THREE.InstancedMesh(geometry(shape),surface,placements.length),dummy=new THREE.Object3D();placements.forEach((item,index)=>{dummy.position.set(...item.position);dummy.rotation.set(...(item.rotation||[0,0,0]));dummy.scale.set(...(item.scale||[1,1,1]));dummy.updateMatrix();value.setMatrixAt(index,dummy.matrix);});value.instanceMatrix.needsUpdate=true;parent.add(value);return value;}
 function line(points,radius,surface,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*3),radius,5,false),surface,parent);}
 function between(a,b,radius,surface,parent){const first=new THREE.Vector3(...a),last=new THREE.Vector3(...b),object=mesh(new THREE.CylinderGeometry(radius,radius*.95,first.distanceTo(last),8),surface,parent);object.position.copy(first).add(last).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),last.sub(first).normalize());return object;}
 function model(key,position){const group=new THREE.Group();group.name=key;group.userData.lensKey=key;group.position.set(...position);content.add(group);objects.set(key,group);return group;}
 const gold=material({color:palette.champagne,metalness:.72,roughness:.3}),bronze=material({color:palette.champagneDeep,metalness:.64,roughness:.4}),stone=material({color:realm.stone,roughness:.92}),stoneShade=material({color:tint(realm.stone,realm.ground,.35),roughness:1}),dark=material({color:worldArtMaterials.monumentDark,metalness:.28,roughness:.56}),wood=material({color:tint(realm.ground,palette.goldInk,.3),roughness:.82}),cloth=material({color:realm.cloth,roughness:.86}),ivory=material({color:worldArtMaterials.dust,roughness:.85}),skin=material({color:worldCrowdPalette.skin[look.skin],roughness:.84}),hair=material({color:look.hair,roughness:.87}),foliage=material({color:tint(worldCartographyArt.landmarkGarden,realm.cloth,.16),roughness:1}),foliageLight=material({color:tint(worldCartographyArt.landmarkGarden,realm.sun,.18),roughness:1});
 const energy=material({color:worldArtMaterials.monumentEmission,emissive:worldArtMaterials.monumentBlue,emissiveIntensity:.65,metalness:.35,roughness:.22}),light=material({color:palette.champagneHighlight,emissive:palette.champagne,emissiveIntensity:.8,roughness:.35});
 const shadow=basic({color:realm.night,transparent:true,opacity:.15,depthWrite:false});
 function contact(parent,x,z,sx,sz){const disk=mesh(new THREE.CircleGeometry(1,24),shadow,parent,x,.015,z);disk.rotation.x=-Math.PI/2;disk.scale.set(sx,sz,1);}

 // A shore extends beyond the camera rather than sitting on a display podium.
 mesh(new THREE.BoxGeometry(42,.18,30),stoneShade,environment,0,-.14,11.8);
 const paving=[];for(let row=0;row<9;row++)for(let col=0;col<12;col++)paving.push({position:[(col-5.5)*1.2+(row%2)*.6,-.027,row*1.24-2.6],scale:[1.15,.055,1.18]});
 instances(new THREE.BoxGeometry(1,1,1),stone,environment,paving);
 const shore=[];for(let i=0;i<30;i++)shore.push({position:[(i-14.5)*1.3,-.11,-3.3],rotation:[0,(i%3)*.035,0],scale:[1.27,.43,.6]});
 instances(new THREE.BoxGeometry(1,1,1),stoneShade,environment,shore);
 const waterShape=new THREE.PlaneGeometry(130,95,36,24);waterShape.rotateX(-Math.PI/2);
 const water=mesh(waterShape,material({color:tint(worldArtMaterials.monumentBlue,realm.night,.36),metalness:.4,roughness:.25}),environment,0,-.26,-51);
 const waterPositions=waterShape.attributes.position,waterBase=waterPositions.array.slice();
 animations.push(t=>{if(!environment.visible)return;for(let i=0;i<waterPositions.count;i++)waterPositions.setY(i,waterBase[i*3+1]+Math.sin(waterBase[i*3]*.33+t*.45)*Math.cos(waterBase[i*3+2]*.21+t*.2)*.045);waterPositions.needsUpdate=true;});
 const shimmer=basic({color:realm.sun,transparent:true,opacity:.09,depthWrite:false}),ripples=[];
 for(let i=0;i<28;i++)ripples.push({position:[Math.sin(i*2.41)*9,-.205,-5-i*1.7],rotation:[-Math.PI/2,0,.06*Math.sin(i)],scale:[.8+(i%5)*.7,.015,1]});
 instances(new THREE.PlaneGeometry(1,1),shimmer,environment,ripples);
 const farGround=material({color:tint(realm.ground,realm.night,.38),roughness:1}),islands=[[-15,-.5,-29,17,3.1,6],[9,-.6,-37,21,4,8],[31,-.6,-27,16,2.4,5]];
 for(const [x,y,z,sx,sy,sz]of islands){const hill=mesh(new THREE.SphereGeometry(1,18,10),farGround,environment,x,y,z);hill.scale.set(sx,sy,sz);}
 const sun=mesh(new THREE.SphereGeometry(.95,18,12),basic({color:realm.sun}),environment,-20,8,-48);sun.name='distant-fictional-sun';
 const rocks=[];for(let i=0;i<22;i++)rocks.push({position:[Math.sin(i*2.17)*13,-.04,-3.8-(i%4)*.4],rotation:[i*.19,i*.53,.14],scale:[.45+(i%3)*.26,.23+(i%4)*.12,.36+(i%3)*.2]});
 instances(new THREE.DodecahedronGeometry(1,0),stoneShade,environment,rocks);
 // Trees, reeds and low plants reuse geometry; no map-sized shadow buffers are needed.
 const treeSpots=[[-6.6,0,-1.6],[6.1,0,-1.2],[-7.4,0,4.2],[7.3,0,5.2],[-9.5,0,9.5],[10.3,0,11.2]],crowns=[],trunks=[];
 treeSpots.forEach(([x,y,z],i)=>{const height=2.8+(i%3)*.45;trunks.push({position:[x,y+height/2,z],scale:[.14,height,.14]});
  for(let j=0;j<(look.trees==='fir'?3:5);j++){const angle=j*2.4;crowns.push({position:[x+Math.cos(angle)*.5,y+height+(j%2)*.4,z+Math.sin(angle)*.45],scale:look.trees==='fir'?[1.05-j*.2,1.35,.85-j*.12]:look.trees==='column'?[.66,1.32,.66]:look.trees==='slender'?[.92,.42,.9]:[1.06,.82,.98]});}
 });
 instances(new THREE.CylinderGeometry(1,1.25,1,7),wood,environment,trunks);
 instances(look.trees==='fir'?new THREE.ConeGeometry(1,1.9,10):new THREE.IcosahedronGeometry(1,2),foliage,environment,crowns);
 const plantSpots=[],grassSpots=[];for(let i=0;i<32;i++){const side=i%2?-1:1,x=side*(4.7+(i%5)*.58),z=-2.1+Math.floor(i/2)*.6;plantSpots.push({position:[x,.12,z],scale:[.23+(i%3)*.07,.26,.28]});for(let j=0;j<3;j++)grassSpots.push({position:[x+(j-1)*.14,.25,z],rotation:[0,i*.67+j,side*.1],scale:[.045,.5+(i%3)*.08,1]});}
 instances(new THREE.IcosahedronGeometry(1,0),foliageLight,environment,plantSpots);
 instances(new THREE.PlaneGeometry(1,1),foliage,environment,grassSpots);foliage.side=THREE.DoubleSide;
 for(const x of [-5.3,5.3]){
  const bench=new THREE.Group();bench.position.set(x,0,1.7);bench.rotation.y=x<0?.18:-.18;environment.add(bench);
  for(const z of [-.18,0,.18])mesh(new THREE.BoxGeometry(1.45,.09,.14),wood,bench,0,.47,z);
  for(const bx of [-.55,.55]){mesh(new THREE.BoxGeometry(.07,.48,.46),dark,bench,bx,.23,0);mesh(new THREE.BoxGeometry(.06,.42,.06),dark,bench,bx,.72,-.22);}
  for(const by of [.65,.85])mesh(new THREE.BoxGeometry(1.45,.12,.07),wood,bench,0,by,-.23);
 }
 for(const x of [-7.8,7.8])for(let i=0;i<4;i++){const z=-2.5+i*1.25;mesh(new THREE.CylinderGeometry(.055,.065,.86,8),dark,environment,x,.43,z);mesh(new THREE.SphereGeometry(.075,8,6),bronze,environment,x,.88,z);if(i<3)between([x,.67,z],[x,.67,z+1.25],.025,dark,environment);}

 // An architectural threshold: masonry, inset metalwork and an arched opening.
 const portal=model('portal',[0,0,-2.2]);
 const archHeight=look.arch==='wide'?.75:look.arch==='point'?1.25:look.arch==='angular'?.88:1.08,spring=1.95,width=1.02;
 function crownY(x,w,h){const v=Math.min(1,Math.abs(x/w));return look.arch==='angular'?h*(1-v):look.arch==='point'?h*Math.pow(1-v,.7):h*Math.sqrt(Math.max(0,1-v*v));}
 function archShape(w,base,h,bottom=0){const shape=new THREE.Shape();shape.moveTo(-w,bottom);shape.lineTo(-w,base);for(let i=0;i<=28;i++){const x=-w+i/28*w*2;shape.lineTo(x,base+crownY(x,w,h));}shape.lineTo(w,bottom);shape.closePath();return shape;}
 const wallShape=archShape(width+.25,spring,archHeight+.24,-.015),opening=archShape(width,spring,archHeight,.12);wallShape.holes.push(new THREE.Path(opening.getPoints().reverse()));
 const masonry=mesh(new THREE.ExtrudeGeometry(wallShape,{depth:.39,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:1,curveSegments:12}),stone,portal,0,0,-.17);masonry.name='masonry-arch';
 const edgePoints=[[-width,.14,.25],[-width,spring,.25]];for(let i=0;i<=28;i++){const x=-width+i/28*width*2;edgePoints.push([x,spring+crownY(x,width,archHeight),.25]);}edgePoints.push([width,.14,.25]);
 const portalInner=line(edgePoints,.025,energy,portal);
 for(const x of [-1.19,1.19]){mesh(new THREE.BoxGeometry(.44,.17,.63),stoneShade,portal,x,.08,0);mesh(new THREE.BoxGeometry(.4,.14,.55),stoneShade,portal,x,spring-.07,0);mesh(new THREE.BoxGeometry(.035,1.53,.035),gold,portal,x,.99,.265);for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.37,.025,.43),stoneShade,portal,x,.42+i*.37,.015);}
 for(let i=1;i<8;i++){const x=-width+i/8*width*2,y=spring+crownY(x,width,archHeight)+.125,block=mesh(new THREE.BoxGeometry(.1,.21,.435),stoneShade,portal,x,y,0);block.rotation.z=Math.atan2(-x,archHeight)*.62;}
 mesh(new THREE.BoxGeometry(2.72,.12,.85),stoneShade,portal,0,.03,.18);mesh(new THREE.BoxGeometry(2.42,.075,.59),stone,portal,0,.13,.15);
 const crown=mesh(new THREE.OctahedronGeometry(.09,0),gold,portal,0,spring+archHeight+.31,.12);crown.scale.set(.85,1.2,.45);
 for(const x of [-1.19,1.19]){mesh(new THREE.SphereGeometry(.043,10,8),light,portal,x,1.69,.28);const lantern=new THREE.PointLight(palette.champagneHighlight,.95,3.4,2);lantern.position.set(x,1.68,.43);portal.add(lantern);}
 const curtain=mesh(new THREE.ShapeGeometry(opening),basic({color:worldArtMaterials.monumentEmission,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}),portal,0,0,-.05);
 let chestOpen=false,portalOpen=false;
 animations.push(t=>{curtain.material.opacity=(portalOpen?.18:.045)+Math.sin(t*.65)*.012;});
 contact(content,0,-2.1,1.55,.48);

 const chest=model('chest',[-1.65,0,.85]);chest.rotation.y=.19;
 const chestBody=new THREE.Group();chestBody.name='wooden-coffer';chest.add(chestBody);
 mesh(new THREE.BoxGeometry(1.08,.1,.79),dark,chestBody,0,.12,0);mesh(new THREE.BoxGeometry(.96,.035,.69),cloth,chestBody,0,.183,0);
 for(const z of [-.38,.38])for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(1.07,.091,.07),wood,chestBody,0,.23+i*.092,z);
 for(const x of [-.53,.53])mesh(new THREE.BoxGeometry(.07,.39,.78),wood,chestBody,x,.36,0);
 for(const x of [-.46,.46])for(const z of [-.425,.425])mesh(new THREE.BoxGeometry(.065,.46,.025),bronze,chestBody,x,.35,z);
 mesh(new THREE.BoxGeometry(1.16,.045,.87),dark,chestBody,0,.17,0);
 for(const z of [-.415,.415])mesh(new THREE.BoxGeometry(1.16,.045,.04),dark,chestBody,0,.55,z);
 for(const x of [-.56,.56])mesh(new THREE.BoxGeometry(.04,.045,.79),dark,chestBody,x,.55,0);
 const rivets=[];for(const x of [-.46,.46])for(const y of [.23,.36,.49])for(const z of [-.445,.445])rivets.push({position:[x,y,z],scale:[.018,.018,.011]});
 instances(new THREE.SphereGeometry(1,6,4),gold,chestBody,rivets);
 for(const x of [-.565,.565]){const handle=mesh(new THREE.TorusGeometry(.085,.013,5,14,Math.PI),bronze,chestBody,x,.39,0);handle.rotation.y=Math.PI/2;}
 const lid=new THREE.Group();lid.name='hinged-coffer-lid';lid.position.set(0,.57,-.4);chest.add(lid);
 const dome=mesh(new THREE.CylinderGeometry(.405,.405,1.12,20,1,false,0,Math.PI),wood,lid,0,0,.4);dome.rotation.z=Math.PI/2;
 for(const x of [-.46,.46]){const band=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;band.push([x,Math.sin(a)*.414,.4-Math.cos(a)*.414]);}line(band,.026,bronze,lid);}
 for(const z of [-.02,.82])mesh(new THREE.BoxGeometry(1.16,.035,.04),bronze,lid,0,0,z);
 for(const x of [-.56,.56])mesh(new THREE.BoxGeometry(.04,.035,.85),bronze,lid,x,0,.4);
 const lining=material({color:tint(realm.ground,worldArtMaterials.dust,.19),roughness:.92,side:THREE.DoubleSide});
 const lidLining=mesh(new THREE.CylinderGeometry(.393,.393,1.08,20,1,true,0,Math.PI),lining,lid,0,0,.4);lidLining.rotation.z=Math.PI/2;
 for(const x of [-.46,.46])mesh(new THREE.CylinderGeometry(.035,.035,.13,8),gold,chest,x,.58,-.43).rotation.z=Math.PI/2;
 mesh(new THREE.BoxGeometry(.16,.17,.04),bronze,chestBody,0,.44,.435);mesh(new THREE.BoxGeometry(.027,.055,.012),dark,chestBody,0,.44,.46);
 const chestLight=mesh(new THREE.PlaneGeometry(.91,.65),basic({color:palette.champagneHighlight,transparent:true,opacity:.35,side:THREE.DoubleSide}),chestBody,0,.2,0);chestLight.rotation.x=-Math.PI/2;chestLight.visible=false;
 contact(content,-1.65,.85,.74,.5);

 // A faceted, elongated mineral with a bright core and restrained gold edges.
 const fragment=model('fragment',[.15,0,1.65]),crystal=new THREE.Group();crystal.name='justice-crystal';crystal.position.y=1.22;fragment.add(crystal);
 const crystalVertices=[],rings=6;for(let i=0;i<rings;i++){const a=i/rings*Math.PI*2,b=(i+1)/rings*Math.PI*2,p=[Math.cos(a)*.23,.08,Math.sin(a)*.23],q=[Math.cos(b)*.23,.08,Math.sin(b)*.23],r=[Math.cos(a)*.13,-.25,Math.sin(a)*.13],s=[Math.cos(b)*.13,-.25,Math.sin(b)*.13];crystalVertices.push(0,.56,0,...p,...q,...p,...r,...s,...p,...s,...q,...r,0,-.52,0,...s);}
 const crystalGeometry=new THREE.BufferGeometry();crystalGeometry.setAttribute('position',new THREE.Float32BufferAttribute(crystalVertices,3));crystalGeometry.computeVertexNormals();
 const fragmentMaterial=new THREE.MeshPhysicalMaterial({color:tint(realm.sky,worldArtMaterials.monumentEmission,.38),metalness:.22,roughness:.12,clearcoat:1,clearcoatRoughness:.16,transparent:true,opacity:.91,emissive:worldArtMaterials.monumentBlue,emissiveIntensity:.18});materials.add(fragmentMaterial);
 mesh(crystalGeometry,fragmentMaterial,crystal);const edges=new THREE.LineSegments(geometry(new THREE.EdgesGeometry(crystalGeometry,12)),new THREE.LineBasicMaterial({color:palette.champagneHighlight,transparent:true,opacity:.65}));materials.add(edges.material);crystal.add(edges);
 const core=mesh(new THREE.OctahedronGeometry(.09,0),light,crystal);core.scale.set(.6,3.3,.6);
 const pedestal=mesh(new THREE.DodecahedronGeometry(.43,0),stoneShade,fragment,0,.13,0);pedestal.scale.set(1,.45,.86);pedestal.rotation.y=.36;
 const shards=[];for(let i=0;i<3;i++){const shard=mesh(new THREE.OctahedronGeometry(.09,0),fragmentMaterial,fragment,Math.cos(i*2.09)*.43,1.1+Math.sin(i*2.09)*.26,Math.sin(i*2.09)*.26);shard.scale.set(.55,1.35,.55);shards.push(shard);}
 animations.push(t=>{crystal.rotation.y=t*.16;crystal.position.y=1.22+Math.sin(t*.75)*.045;shards.forEach((shard,i)=>{shard.rotation.y=-t*.2+i;shard.position.y=1.1+Math.sin(i*2.09+t*.45)*.15;});});
 const fragmentGlow=new THREE.PointLight(palette.champagneHighlight,.55,3.1);fragmentGlow.position.set(0,1.2,0);fragment.add(fragmentGlow);contact(content,.15,1.65,.52,.34);

 // A human silhouette with sculpted facial features, tailored clothing and readable hands.
 const guardian=model('guardian',[1.8,0,.35]);guardian.rotation.y=-.16;
 const robeProfile=[[.36,.12],[.43,.22],[.37,.58],[.3,.96],[.32,1.29],[.27,1.44],[.16,1.52]].map(([x,y])=>new THREE.Vector2(x,y));
 const robeGeometry=new THREE.LatheGeometry(robeProfile,36),robePositions=robeGeometry.attributes.position;
 for(let i=0;i<robePositions.count;i++){const x=robePositions.getX(i),y=robePositions.getY(i),z=robePositions.getZ(i),fold=1+Math.cos(Math.atan2(x,z)*10)*.035*Math.max(0,1-y/1.6);robePositions.setXYZ(i,x*fold,y,z*fold);}
 robeGeometry.computeVertexNormals();const robe=mesh(robeGeometry,cloth,guardian);robe.name='tailored-robe';robe.scale.set(.88,1,.76);
 if(look.cape){const cape=mesh(new THREE.SphereGeometry(.53,20,14,Math.PI,Math.PI,0,Math.PI*.8),material({color:tint(realm.cloth,realm.night,.24),roughness:.95}),guardian,0,1.15,-.07);cape.scale.set(.72,.78,.85);}
 for(const x of [-.14,.14]){const shoe=mesh(new THREE.SphereGeometry(.115,10,8),dark,guardian,x,.075,.085);shoe.scale.set(.82,.52,1.55);}
 const belt=mesh(new THREE.CylinderGeometry(.31,.31,.06,20),bronze,guardian,0,.95,0);belt.scale.z=.77;
 const stole=mesh(new THREE.BoxGeometry(.105,1.15,.045),ivory,guardian,-.15,.93,.23);stole.rotation.z=.13;
 line([[-.27,1.38,.13],[-.21,1.18,.23],[-.14,.75,.265],[-.2,.24,.29]],.012,gold,guardian);
 line([[.27,1.38,.13],[.21,1.18,.23],[.14,.75,.265],[.2,.24,.29]],.012,gold,guardian);
 for(const x of [-.275,.275])mesh(new THREE.SphereGeometry(.13,16,10),cloth,guardian,x,1.35,0).scale.set(.94,1,.8);
 between([-.28,1.33,.01],[-.38,1.08,.2],.08,cloth,guardian);between([-.38,1.08,.2],[-.24,1.14,.45],.067,cloth,guardian);
 between([.28,1.33,.01],[.38,1.07,.1],.08,cloth,guardian);between([.38,1.07,.1],[.57,1.08,.28],.067,cloth,guardian);
 for(const [x,y,z]of [[-.23,1.14,.47],[.58,1.08,.29]]){mesh(new THREE.SphereGeometry(.077,10,8),skin,guardian,x,y,z).scale.set(.75,1,.72);for(let i=0;i<3;i++)between([x-.037+i*.028,y-.015,z+.04],[x-.037+i*.028,y-.07,z+.055],.012,skin,guardian);}
 mesh(new THREE.CylinderGeometry(.092,.11,.2,10),skin,guardian,0,1.54,0);
 const head=new THREE.Group();head.name='guardian-face';head.position.set(0,1.79,0);head.scale.setScalar(.8);guardian.add(head);
 const faceGeometry=new THREE.SphereGeometry(.232,32,24),facePositions=faceGeometry.attributes.position;
 for(let i=0;i<facePositions.count;i++){const y=facePositions.getY(i);if(y<-.04)facePositions.setX(i,facePositions.getX(i)*(1+Math.max(-.17,(y+.04)*.8)));}
 faceGeometry.computeVertexNormals();mesh(faceGeometry,skin,head,0,0,.025).scale.set(.84,1.12,.85);
 for(const x of [-.198,.198])mesh(new THREE.SphereGeometry(.052,10,8),skin,head,x,-.005,.015).scale.set(.4,1,.68);
 mesh(new THREE.SphereGeometry(.02,12,8),skin,head,0,.012,.2).scale.set(.51,2,.85);
 mesh(new THREE.SphereGeometry(.035,12,10),skin,head,0,-.021,.218).scale.set(.49,.72,.66);
 for(const x of [-.083,.083]){
  mesh(new THREE.SphereGeometry(.035,16,10),ivory,head,x,.037,.197).scale.set(1.08,.25,.32);
  mesh(new THREE.SphereGeometry(.012,12,8),dark,head,x,.037,.21).scale.set(.72,.7,.45);
  line([[x-.031,.038,.198],[x,.048,.211],[x+.031,.038,.201]],.0038,hair,head);
  line([[x-.033,.072,.2],[x,.08,.214],[x+.029,.074,.205]],.007,hair,head);
 }
 line([[-.039,-.095,.192],[0,-.101,.204],[.039,-.095,.192]],.006,material({color:tint(worldCrowdPalette.skin[look.skin],worldCrowdPalette.cloth[4],.35),roughness:1}),head);
 const cap=mesh(new THREE.SphereGeometry(.245,26,18,0,Math.PI*2,0,1.67),hair,head,0,.014,-.013);cap.scale.set(.87,1.12,.92);
 line([[-.19,.085,.12],[-.12,.193,.17],[.035,.218,.155],[.18,.1,.095]],.035,hair,head);
 if(['long','braid','bob','curls'].includes(look.hairStyle)){
  const long=look.hairStyle==='long'||look.hairStyle==='braid';
  const backHair=mesh(new THREE.SphereGeometry(.235,16,12),hair,head,0,long?-.18:-.045,-.08);backHair.scale.set(.89,long?1.7:1.2,.68);
  for(const x of [-.173,.173])line([[x,.06,.06],[x*1.03,-.13,.04],[x*1.03,long?-.42:-.2,-.05]],look.hairStyle==='braid'?.035:.045,hair,head);
  if(look.hairStyle==='curls')for(let i=0;i<9;i++){const a=i/9*Math.PI*2;mesh(new THREE.SphereGeometry(.065,8,6),hair,head,Math.cos(a)*.19,.07+Math.sin(a)*.15,-.04);}
 }
 if(look.hairStyle==='knot')mesh(new THREE.SphereGeometry(.085,10,8),hair,head,0,.24,-.105).scale.set(1,.7,1);
 const circlet=line([[-.2,.12,.07],[-.12,.18,.18],[0,.19,.22],[.12,.18,.18],[.2,.12,.07]],.01,gold,head);
 mesh(new THREE.OctahedronGeometry(.033,0),energy,head,0,.187,.23);
 const emblem=mesh(new THREE.TorusGeometry(.077,.012,5,20),gold,guardian,.04,1.31,.265);emblem.name='guardian-value-seal';
 mesh(new THREE.OctahedronGeometry(.04,0),energy,guardian,.04,1.31,.276);
 const book=new THREE.Group();book.position.set(-.13,1.14,.44);book.rotation.set(.25,-.12,-.12);guardian.add(book);
 for(const x of [-.13,.13]){const page=new THREE.Group();page.rotation.y=x<0?.2:-.2;page.position.x=x;book.add(page);mesh(new THREE.BoxGeometry(.25,.035,.29),ivory,page);mesh(new THREE.BoxGeometry(.27,.018,.31),dark,page,0,-.027,0);for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.17,.002,.006),bronze,page,0,.02,-.09+i*.055);}
 const staff=mesh(new THREE.CylinderGeometry(.022,.027,1.56,8),bronze,guardian,.61,.84,.27);
 const staffCrown=mesh(new THREE.TorusGeometry(.098,.014,5,24),gold,guardian,.61,1.73,.27);mesh(new THREE.OctahedronGeometry(.053,0),energy,guardian,.61,1.73,.27);
 animations.push(t=>{head.rotation.y=Math.sin(t*.28)*.025;head.rotation.z=Math.sin(t*.37)*.01;staffCrown.rotation.y=Math.sin(t*.4)*.12;});
 contact(content,1.8,.35,.49,.33);

 const clueMarkers=new Map(),cluePositions=[[-3.2,0,-1.35],[-3.15,0,2.65],[2.75,0,2.85]];
 (episode.points||[]).forEach((point,index)=>{
  const group=model('clue:'+point.id,cluePositions[index%cluePositions.length]);group.rotation.y=index===0?.3:index===1?-.25:-.42;
  const base=mesh(new THREE.DodecahedronGeometry(.42,0),stoneShade,group,0,.18,0);base.scale.set(1,.55,.85);
  const tablet=mesh(new THREE.BoxGeometry(.52,.66,.1),stone,group,0,.49,-.07);tablet.rotation.x=-.22;
  for(let i=0;i<=index;i++)mesh(new THREE.BoxGeometry(.022,.13,.025),gold,group,(i-index/2)*.068,.6,.038);
  for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.29-i*.032,.012,.025),stoneShade,group,0,.45-i*.055,.045);
  const marker=mesh(new THREE.OctahedronGeometry(.075,0),energy,group,0,.92,0);marker.scale.set(.7,1.4,.7);clueMarkers.set(point.id,marker);
  animations.push(t=>{marker.position.y=.92+Math.sin(t*.7+index)*.035;marker.rotation.y=t*.13+index;});
  contact(content,group.position.x,group.position.z,.45,.33);
 });
 const specks=new THREE.BufferGeometry(),positions=new Float32Array(42*3);for(let i=0;i<42;i++){positions[i*3]=Math.sin(i*2.4)*3.3;positions[i*3+1]=.5+(i%13)/6;positions[i*3+2]=Math.cos(i*2.4)*2.5;}
 specks.setAttribute('position',new THREE.BufferAttribute(positions,3));const speckMaterial=new THREE.PointsMaterial({color:palette.champagneHighlight,size:.018,transparent:true,opacity:.43,depthWrite:false});materials.add(speckMaterial);const particles=new THREE.Points(geometry(specks),speckMaterial);content.add(particles);animations.push(t=>particles.rotation.y=t*.009);
 // Bake static details by material while retaining the independently animated parts.
 // Geometry remains attached to its inspectable model, so merged surfaces keep raycast identity.
 function batch(parent,excluded=[]){
  const omitted=new Set(excluded),byMaterial=new Map();parent.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert();
  parent.traverse(node=>{if(!node.isMesh||node.isInstancedMesh||Array.isArray(node.material))return;let ancestor=node;while(ancestor&&ancestor!==parent){if(omitted.has(ancestor))return;ancestor=ancestor.parent;}const matches=byMaterial.get(node.material)||[];matches.push(node);byMaterial.set(node.material,matches);});
  byMaterial.forEach((matches,surface)=>{if(matches.length<2)return;const copies=matches.map(node=>{const copy=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();return copy.applyMatrix4(inverse.clone().multiply(node.matrixWorld));});
   const merged=mergeGeometries(copies,false);copies.forEach(copy=>copy.dispose());if(!merged)return;
   matches.forEach(node=>node.parent.remove(node));mesh(merged,surface,parent);
  });
 }
 batch(environment,[water]);batch(portal,[portalInner,curtain]);batch(chestBody,[chestLight]);batch(lid);batch(head,[circlet]);batch(guardian,[head,staffCrown]);
 (episode.points||[]).forEach(point=>batch(objects.get('clue:'+point.id),[clueMarkers.get(point.id)]));
 const remotePositions=new Map([...objects].map(([id,group])=>[id,group.position.clone()]));
 // Camera overlays and native AR contain only small artifacts, never a virtual shore.
 const compactPositions=new Map([['portal',[0,0,-1.2]],['guardian',[1.22,0,0]],['chest',[-1.15,0,.25]],['fragment',[0,0,1.05]],...(episode.points||[]).map((point,i)=>['clue:'+point.id,[[-1.9,0,-.9],[-1.8,0,1.55],[1.85,0,1.5]][i%3]])]);
 let disposed=false,currentMode='3d';
 return {
  content,environment,objects,realm,background,fogColor:duskHorizon,geometries,materials,textures,
  update(time){if(disposed)return;animations.forEach(update=>update(time));},
  setMode(mode){currentMode=['camera','ar'].includes(mode)?mode:'3d';environment.visible=currentMode==='3d';particles.visible=currentMode==='3d';objects.forEach((group,id)=>{if(currentMode==='3d')group.position.copy(remotePositions.get(id));else group.position.set(...compactPositions.get(id));});content.children.filter(node=>node.material===shadow).forEach(node=>{node.visible=currentMode==='3d';});},
  setProgress(progress){const solved=progress?.solved||[];chestOpen=progress?.chestOpened===true;portalOpen=progress?.portalOpened===true;lid.rotation.x=chestOpen?-Math.PI*.48:0;chestLight.visible=chestOpen;fragmentMaterial.emissiveIntensity=chestOpen?.6:.18+Math.min(solved.length,3)*.06;fragmentGlow.intensity=chestOpen?2.1:.55;clueMarkers.forEach((marker,id)=>{marker.material=solved.includes(id)?light:energy;});circlet.material=chestOpen?gold:bronze;portalInner.material=portalOpen?light:energy;curtain.material.opacity=portalOpen?.18:.045;},
  dispose(){if(disposed)return;disposed=true;geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());content.clear();environment.clear();objects.clear();animations.length=0;},
 };
}
