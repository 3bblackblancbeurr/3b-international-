import {COUNTRIES,isCountry} from './countries.js';
import {createCountryEnvironment} from './country-environment.js';
import {createNaturalGround} from '../natural-ground.js';
import {createFlora} from '../flora.js';
import {createGroundCover} from './nature.js';
import {surfaceTexture} from '../surfaces.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {BUILDINGS,ROOMS,ROOM_SHELVES,ROADS,WORLDS,POINTS,EIFFEL_SITE} from './data.js';
import {foliageAtlas} from '../foliage-atlas.js';

const v=(x,y,z)=>new T.Vector3(x,y,z);
export function createEnvironment(scene,zone,{onError=()=>{},quality='high',occlusion}={}){
 if(isCountry(zone))return createCountryEnvironment(scene,zone,{onError,quality,occlusion});
 const root=new T.Group();scene.add(root);root.name=zone==='sanctuary'?'Sanctuaire du Cercle':'France · Quartier des Liens';
 const owned=new Set(),textures=new Set(),batches=new Map(),assets=[],animated=[],restored=new T.Group(),corruption=new T.Group(),memory=new T.Group();
 root.add(restored,corruption,memory);let dead=false,flags={};
 const textureLoader=new T.TextureLoader();
 function tex(url,repeat=1,srgb=false){const t=textureLoader.load(url,()=>{if(dead)t.dispose();},undefined,()=>onError('Une texture manque : '+url));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=quality==='light'?2:4;if(srgb)t.colorSpace=T.SRGBColorSpace;textures.add(t);return t;}
 function mat(name,color,roughness=.8,metalness=0,options={}){const m=new T.MeshStandardMaterial({name,color,roughness,metalness,...options});owned.add(m);if(!/Earth|water|foliage|cobble|Horizon|hills/.test(name))occlusion?.apply(m);return m;}
 const stone=mat('Origins limestone','#e1d5bc',.87,0,{map:tex('/world/origins/limestone-color.webp',1,true)}),cream=mat('Ivory edges','#eee0c5'),bronze=mat('Champagne bronze','#a9956a',.37,.72),dark=mat('Blackened bronze','#293439',.48,.7),wood=mat('Weathered walnut','#715944'),green=mat('Garden greens','#627044'),dirt=mat('Earth','#75816a'),blue=mat('Memory light','#7bd5eb',.4,.25,{emissive:'#277dc1',emissiveIntensity:1.6}),warm=mat('Lantern glass','#ffe4ae',.3,0,{emissive:'#ffc16b',emissiveIntensity:1.1}),slate=mat('Old zinc','#52616b',.52,.4);
 const plasterNormal=tex('/world/paris/textures/plastered_wall_02_nor_gl.jpg'),plasterRoughness=tex('/world/paris/textures/plastered_wall_02_Rough.jpg');stone.normalMap=plasterNormal;stone.normalScale.set(.22,.22);stone.roughnessMap=plasterRoughness;
 const cobble=mat('Paris cobble','#c8c4b8',.92,0,{map:tex('/world/paris/textures/cobblestone_floor_08_Diffuse.jpg',1,true),normalMap:tex('/world/paris/textures/cobblestone_floor_08_nor_gl.jpg'),roughnessMap:tex('/world/paris/textures/cobblestone_floor_08_Rough.jpg')});cobble.normalScale.set(.4,.4);
 const leafMap=foliageAtlas();textures.add(leafMap);const leaf=mat('Tilleul foliage','#648446',.95,0,{map:leafMap,alphaTest:.4,side:T.DoubleSide});
 const natural=createNaturalGround('france');natural.material.vertexColors=false;natural.material.color.set('#98a67a');natural.texture?.repeat.set(300,300);owned.add(natural.material);textures.add(natural.texture);
 const flora=createFlora('france',384,occlusion),treeSectors=new Map();

 leaf.onBeforeCompile=shader=>{shader.uniforms.windTime={value:0};shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(position.y*2.1 + position.z*.5 + windTime*1.3)*.035;');leaf.userData.shader=shader;};
 const geo={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,16),sphere:new T.SphereGeometry(1,12,8),leaf:new T.PlaneGeometry(1,1)};
 function part(g,m,x,y,z,sx=1,sy=1,sz=1,rot=0,parent=root){const geometry=g.index?g.toNonIndexed():g.clone(),matrix=new T.Matrix4().compose(v(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,rot,0)),v(sx,sy,sz));geometry.applyMatrix4(matrix);if(m===cobble){const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2.4,p.getZ(i)/2.4);}const key=parent.uuid+m.uuid;if(!batches.has(key))batches.set(key,{parent,m,list:[]});batches.get(key).list.push(geometry);}
 const box=(m,x,y,z,w,h,d,a=0,parent=root)=>part(geo.box,m,x,y,z,w,h,d,a,parent);
 const cylinder=(m,x,y,z,r,h,parent=root)=>part(geo.cyl,m,x,y,z,r,h,r,0,parent);
 function rod(m,a,b,r,parent=root){const direction=b.clone().sub(a),g=new T.CylinderGeometry(r,r,direction.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),direction.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());part(g,m,0,0,0,1,1,1,0,parent);g.dispose();}
 function arch(m,x,y,z,r,height,depth=1,parent=root){const shape=new T.Shape();shape.moveTo(-r-.36,0);shape.lineTo(-r-.36,height-r);shape.absarc(0,height-r,r+.36,Math.PI,0,true);shape.lineTo(r+.36,0);shape.lineTo(r,0);shape.lineTo(r,height-r);shape.absarc(0,height-r,r,0,Math.PI,false);shape.lineTo(-r,0);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:2,steps:1,curveSegments:20});part(g,m,x,y,z-depth/2,1,1,1,0,parent);g.dispose();}
 function plaque(text,x,y,z,width=2,parent=root){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#172c30';c.fillRect(0,0,512,128);c.strokeStyle='#b7a47c';c.lineWidth=3;c.strokeRect(8,8,496,112);c.font='500 32px sans-serif';c.fillStyle='#eadcc0';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,64,475);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);const m=mat('Sign '+text,'#ffffff',.8,0,{map:texture});part(geo.leaf,m,x,y,z,width,width/4,1,0,parent);}
 function tree(x,z,size=1){const key=Math.floor(x/36)+':'+Math.floor(z/36);if(!treeSectors.has(key)){const g=new T.Group();root.add(g);treeSectors.set(key,g);}flora.plant('Tree',x,0,z,size*.65,(x+z)*.14,treeSectors.get(key));}

 function planter(x,z,parent=root){box(stone,x,.27,z,2,.54,1.1,0,parent);box(dirt,x,.55,z,1.84,.08,.94,0,parent);for(let i=0;i<25;i++){const a=i*2.399;part(geo.leaf,leaf,x-.8+(i%9)*.2,.87+Math.sin(i)*.14,z+Math.cos(a)*.25,.38,.75,1,a,parent);if(i%3===0)part(geo.sphere,cream,x-.7+(i%8)*.2,1.15+Math.sin(i)*.12,z+.05,.045,.045,.045,0,parent);}}
 function lamp(x,z,parent=root){cylinder(dark,x,1.6,z,.045,3.2,parent);cylinder(bronze,x,.15,z,.16,.3,parent);box(dark,x,3.08,z,.38,.07,.38,0,parent);box(warm,x,3.35,z,.31,.48,.31,0,parent);for(const sx of [-1,1])for(const sz of [-1,1])box(dark,x+sx*.18,3.35,z+sz*.18,.025,.57,.025,0,parent);box(dark,x,3.68,z,.5,.09,.5,0,parent);}
 function bench(x,z,a=0,parent=root){for(let i=0;i<4;i++)box(wood,x,.5,z-.22+i*.15,1.9,.07,.11,a,parent);for(const sx of [-.7,.7])box(dark,x+sx,.24,z,.1,.48,.4,a,parent);box(wood,x,.94,z-.28,1.9,.12,.1,a,parent);}
 const gravelMap=surfaceTexture('gravel');textures.add(gravelMap);const gravel=mat('Path gravel','#a8a18b',1,0,{map:gravelMap,bumpMap:gravelMap,bumpScale:.025,side:T.DoubleSide});
 function paving(points,width){const curve=new T.CatmullRomCurve3(points.map(p=>v(p[0],.024,p[1]))),steps=points.length*18,vertices=[],uv=[],indices=[];for(let i=0;i<=steps;i++){const p=curve.getPoint(i/steps),t=curve.getTangent(i/steps),n=v(-t.z,0,t.x);for(const sign of [-1,1]){const q=p.clone().addScaledVector(n,sign*width/2);vertices.push(q.x,q.y,q.z);uv.push(sign<0?0:width/3,i/steps*curve.getLength()/3);}if(i<steps){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}for(const side of [-1,1]){const edge=[],edgeUV=[],ix=[];for(let i=0;i<=steps;i++){const p=curve.getPoint(i/steps),t=curve.getTangent(i/steps),n=v(-t.z,0,t.x),fringe=.45+.15*Math.sin(p.x*1.1+p.z*.7);for(const off of [width/2,width/2+fringe]){const q=p.clone().addScaledVector(n,side*off);edge.push(q.x,.023,q.z);edgeUV.push(q.x*2,q.z*2);}if(i>2&&i<steps-3){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}}const border=new T.BufferGeometry();border.setAttribute('position',new T.Float32BufferAttribute(edge,3));border.setAttribute('uv',new T.Float32BufferAttribute(edgeUV,2));border.setIndex(ix);border.computeVertexNormals();part(border,gravel,0,0,0);border.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();part(g,cobble,0,0,0);g.dispose();}
 // Continuous landscape extends beyond navigable bounds; no island-edge illusion.
 const land=new T.PlaneGeometry(900,900,32,32);land.rotateX(-Math.PI/2);part(land,natural.material,0,-.025,0);land.dispose();
 const hills=mat('Distant hills','#83948a');for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=250;part(geo.sphere,hills,Math.sin(a)*r,-20,Math.cos(a)*r,70,32+(i%5)*6,58);}
 const gateGroups=[],slots=[],doorway=new T.Group();root.add(doorway);let circlePart;
 if(zone==='sanctuary'){
  cylinder(stone,0,-.035,0,39,.09);for(const r of [12,22,36]){const g=new T.TorusGeometry(r,.032,5,120);g.rotateX(Math.PI/2);part(g,bronze,0,.025,0);g.dispose();}
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,g=new T.Group();g.position.set(Math.sin(a)*29,0,-Math.cos(a)*29);g.rotation.y=-a;root.add(g);gateGroups.push(g);
   box(stone,0,.22,0,8,.44,4,0,g);arch(stone,0,.44,0,2.0+(i%2)*.2,5.9+(i%3)*.35,1.2,g);arch(bronze,0,.47,.68,1.93+(i%2)*.2,5.88+(i%3)*.35,.08,g);
   for(const sign of [-1,1]){box(stone,sign*2.7,3,0,.6,6,1.7,0,g);for(let k=0;k<3;k++)box(cream,sign*2.7,1+k*2,0,.8,.17,1.85,0,g);box(slate,sign*2.7,6.1,0,.95,.25,1.95,0,g);}
   plaque(WORLDS[i].name,0,5.0,.72,2.5,g);
   const innerMat=mat('Door '+i,COUNTRIES[WORLDS[i].id]?.sky||'#62bed3',.6,.3,{emissive:COUNTRIES[WORLDS[i].id]?.sky||'#27809b',emissiveIntensity:.45,transparent:true,opacity:.68,side:T.DoubleSide});const p=new T.Mesh(new T.PlaneGeometry(3.8,4.3),innerMat);p.position.set(0,2.6,0);g.add(p);animated.push({object:p,type:'portal'});
   for(let k=0;k<4+i%3;k++){const theta=k/(4+i%3)*Math.PI*2;cylinder(bronze,Math.sin(theta)*.65,5.3+Math.cos(theta)*.65,.75,.08,.07,g);}
   // Unresolved guardian identities stay veiled, rather than counterfeit named statues.
   const sx=Math.sin(a+.18)*23,sz=-Math.cos(a+.18)*23;cylinder(stone,sx,.4,sz,.7,.8);part(geo.sphere,stone,sx,2.25,sz,.5,1.4,.43);part(geo.sphere,stone,sx,3.68,sz,.29,.35,.29);box(bronze,sx,1.2,sz+.44,.035,1.4,.025);
  }
  for(let i=0;i<8;i++){const start=i*Math.PI/4+.045,arc=Math.PI/4-.09,g=new T.TorusGeometry(5.4,.65,6,18,arc);g.rotateZ(start);part(g,stone,0,7.2,0);g.dispose();const trim=new T.TorusGeometry(5.3,.04,5,18,arc);trim.rotateZ(start);part(trim,bronze,0,7.2,.68);trim.dispose();}
  const gap=new T.TorusGeometry(5.4,.65,6,18,Math.PI/4-.09);gap.rotateZ(.045);circlePart=new T.Mesh(gap,blue);circlePart.position.set(0,7.2,0);root.add(circlePart);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,g=new T.Mesh(new T.OctahedronGeometry(.22),i?bronze:blue);g.position.set(Math.sin(a)*2,.8,9+Math.cos(a)*2);root.add(g);slots.push(g);}
  cylinder(stone,0,.1,9,3.4,.2);cylinder(stone,0,.2,9,3.1,.4);cylinder(stone,0,.3,9,2.8,.6);plaque('LE CERCLE BRISÉ',0,1.1,11.2,2.5);
  for(let i=0;i<13;i++){const a=i*2.4;tree(Math.sin(a)*34,Math.cos(a)*34,.95+i%3*.13);}
  for(const [x,z] of [[-13,12],[13,12],[-14,-12],[14,-12]]){planter(x,z);lamp(x+2,z);bench(x,z+2);}
  cylinder(stone,-7,.15,16,1.8,.3);part(geo.sphere,green,-7,.32,16,1.5,.2,1.2);
 }else{
  // Shopfront details stay inside the building footprint: walking lanes remain clear.
  for(const [index,b] of BUILDINGS.entries()){
   const frontage=new T.Group();frontage.position.set(b.x,0,b.z);frontage.rotation.y=b.angle;root.add(frontage);
   const front=b.depth/2+.4,w=b.width;
   const awning=mat('Store canopy '+index,['#5d7773','#965f51','#b1a078','#586c83'][index%4]);
   if(b.model==='Cafe'||b.model==='Galerie'){
    box(awning,0,2.8,front-.25,w*.67,.16,1.25,0,frontage);
    for(let k=-3;k<=3;k++)box(cream,k*w*.09,2.72,front+.27,.12,.25,.12,0,frontage);
    plaque(b.model==='Cafe'?'CAFÉ DES LIENS':'GALERIE DES MÉMOIRES',0,3.3,front-.1,w*.58,frontage);
    for(const sign of [-1,1]){box(dark,sign*(w/2-.6),2.5,front,.3,.55,.2,0,frontage);box(warm,sign*(w/2-.6),2.5,front+.12,.22,.4,.08,0,frontage);}
   }else{
    plaque(['MAISON DES VOYAGEURS','COUR DES ARTISANS','LES VERRIÈRES','RÉSIDENCE DU TILLEUL'][index%4],0,2.95,front-.1,w*.5,frontage);
    for(const sign of [-1,1]){const balcony=new T.Group();balcony.position.y=3.65;frontage.add(balcony);planter(sign*(w/2-1.25),front-.1,balcony);}
   }
   // Shop identifiers and small wall lamps give each frontage an address.
   plaque(String(3+index*2),-w*.35,1.9,front-.05,.45,frontage);
  }
  cylinder(cobble,EIFFEL_SITE.x,-.005,EIFFEL_SITE.z,19,.03);
  for(const side of [-1,1])for(let i=0;i<4;i++){tree(EIFFEL_SITE.x+side*24,EIFFEL_SITE.z+18-i*12,.9+i*.04);}
  for(const side of [-1,1]){bench(EIFFEL_SITE.x+side*16,EIFFEL_SITE.z+14);lamp(EIFFEL_SITE.x+side*18,EIFFEL_SITE.z+17);}
  for(const road of ROADS)paving(road,5.5);for(const road of ROADS){for(const [x,z] of [road[0],road.at(-1)]){const cap=new T.CircleGeometry(2.76,32);cap.rotateX(-Math.PI/2);part(cap,cobble,x,.0241,z);cap.dispose();}}cylinder(stone,0,-.009,-14,15,.055);for(const road of ROADS.slice(0,1))paving(road,5.5);
  // A real entrance arch is the way back, separate from the game's chapter gate.
  arch(stone,0,0,27,2.1,5.8);arch(bronze,0,.02,27.56,2.02,5.7,.06);plaque('SANCTUAIRE',0,5.05,27.65,2.5);
  for(const room of ROOMS){
   const {x,z,w,d}=room,isArchive=room.id==='archives',h=isArchive?6:4.3,opening=isArchive?3.8:1.8;
   box(stone,x,.015,z,w,.06,d);box(stone,x,h/2,z-d/2,w,h,.4);box(stone,x-w/2,h/2,z,.4,h,d);box(stone,x+w/2,h/2,z,.4,h,d);
   for(const sign of [-1,1])box(stone,x+sign*(w+opening)/4,h/2,z+d/2,(w-opening)/2,h,.4);
   box(stone,x,(h+2.65)/2,z+d/2,opening,h-2.65,.4);arch(cream,x,0,z+d/2+.17,opening/2,2.65,.35);
   box(slate,x,h+.16,z,w+.6,.3,d+.6);box(bronze,x,h-.35,z+d/2+.25,w+.35,.10,.18);plaque(isArchive?'ARCHIVES':room.id==='atelier'?'ATELIER DES LIENS':'MAISON DES SOUVENIRS',x,3.35,z+d/2+.24,isArchive?4:3);
   for(const shelf of ROOM_SHELVES.filter(shelf=>shelf.room===room.id)){box(wood,shelf.x,shelf.h/2,shelf.z,shelf.w,shelf.h,shelf.d);for(let j=0;j<6;j++)box(bronze,shelf.x,.45+j*.28,shelf.z+.82,.85,.075,.04);}
   for(let j=0;j<(isArchive?7:3);j++){const xx=x-w/2+1.8+j*(w-3.6)/(isArchive?6:2);box(cream,xx,h-.8,z+d/2+.25,.17,.9,.19);}
   lamp(x-w/2-1,z+d/2+.4);lamp(x+w/2+1,z+d/2+.4);
  }
  box(dark,0,2,-54.45,3.8,4,.3,0,doorway);for(let x=-1.5;x<=1.5;x+=.5)box(blue,x,2,-54.25,.055,3.5,.03,0,doorway);
  for(const sign of [-1,1]){cylinder(stone,sign*5,.08,-44,1.1,.16);const ring=new T.TorusGeometry(.9,.035,6,40);ring.rotateX(Math.PI/2);part(ring,blue,sign*5,.18,-44);ring.dispose();}
  // Continuous elevated promenade, ramps on either side, architectural supports.
  for(let x=-17;x<17;x+=.5){const y=Math.min(2.4,(17-Math.abs(x+.25))*.3);if(Math.abs(x+.25)>9)box(stone,x+.25,y/2,-34,.5,y,4);else box(stone,x+.25,y-.12,-34,.5,.24,4.2);for(const z of [-36.05,-31.95]){box(dark,x+.25,y+.6,z,.035,1.2,.035);box(bronze,x+.25,y+1.2,z,.52,.045,.045);}}
  for(const x of [-6.75,-2.25,2.25,6.75])arch(stone,x,0,-34,1.8,2.23,3.9);
  plaque('PASSAGE DES LIENS',0,3.3,-31.85,3.3);
  for(const [x,z,size] of [[-10,5,1],[10,7,1.1],[-15,-18,1.15],[15,-16,1.2],[-34,-15,1],[12,-4,.9],[-15,28,.85],[15,28,.8],[-31,-42,1.1],[32,-42,1.15]])tree(x,z,size);
  for(let i=0;i<24;i++){const x=i%2? -62:62,z=35-Math.floor(i/2)*10;tree(x,z,.9+(i%3)*.2);}
  for(const [x,z] of [[-10,12],[10,12],[-12,-22],[12,-22],[-23,26],[24,26],[-32,6],[32,3]]){planter(x,z);bench(x,z+1.3);lamp(x+1.5,z);}
  for(const [x,z] of [[-12,-49],[12,-49],[-9,-51],[9,-51],[-17,29],[17,29]])planter(x,z,restored);
  for(const [x,z] of [[-11,-57],[11,-57],[-7,-73],[7,-73],[-3,-69]]){const g=new T.ConeGeometry(.45,2.7,5);part(g,dark,x,1.2,z,1,1,1,x,corruption);g.dispose();rod(blue,v(x,0,z),v(x+.2,2.5,z),.018,corruption);}
  for(const key of ['trace','echo','echo2','memory','secret']){const p=POINTS[key],group=new T.Group();group.position.set(p.x,(p.y||0)+.1,p.z);group.userData.key=key;memory.add(group);const g=new T.TorusGeometry(.65,.025,6,50);g.rotateX(Math.PI/2);const circle=new T.Mesh(g,blue);group.add(circle);const shard=new T.Mesh(new T.OctahedronGeometry(.16),blue);shard.position.y=.6;group.add(shard);animated.push({object:shard,type:'memory'});}
  const water=mat('Fountain water','#5d9f99',.16,.35);cylinder(stone,-8,.3,-14,1.85,.6);cylinder(water,-8,.63,-14,1.6,.05);cylinder(stone,-8,1.1,-14,.3,1.0);cylinder(water,-8,1.58,-14,.68,.04);
 }
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const buildingBatches=[];let nextLod=0;
 async function parisModels(){if(zone!=='france')return;
  const names=[...new Set(BUILDINGS.map(b=>b.model))];
  for(const detail of (quality==='light'?[false]:[false,true]))for(const name of names){
   const asset=await loader.loadAsync('/world/paris/'+name+(detail?'':'-lod')+'.glb');assets.push(asset);if(dead)continue;asset.scene.updateMatrixWorld(true);const sites=BUILDINGS.filter(b=>b.model===name);
   asset.scene.traverse(mesh=>{if(!mesh.isMesh)return;const material=mesh.material.clone();owned.add(material);occlusion?.apply(material);
    if(material.name==='Paris limestone'){material.map=stone.map;material.normalMap=plasterNormal;material.normalScale.set(.22,.22);material.roughnessMap=plasterRoughness;material.color.set('#cfc1a9');material.roughness=.88;}
    if(/Window blue/.test(material.name)){material.color.set('#263e48');material.roughness=.25;material.metalness=.4;}
    const inst=new T.InstancedMesh(mesh.geometry,material,sites.length),matrices=sites.map(b=>new T.Matrix4().compose(v(b.x,.01,b.z),new T.Quaternion().setFromAxisAngle(v(0,1,0),b.angle),v(b.scale,b.scale,b.scale)).multiply(mesh.matrixWorld));
    inst.count=0;inst.castShadow=detail;inst.receiveShadow=true;root.add(inst);buildingBatches.push({inst,sites,matrices,detail});
   });
  }
  const towerAsset=await loader.loadAsync('/world/paris/Eiffel'+(quality==='light'?'-lod':'')+'.glb');assets.push(towerAsset);if(!dead){const tower=towerAsset.scene;tower.position.set(EIFFEL_SITE.x,0,EIFFEL_SITE.z);tower.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});root.add(tower);}
 }
 function updateBuildingLod(time,player){if(time<nextLod)return;nextLod=time+.35;for(const b of buildingBatches){let count=0;for(let i=0;i<b.sites.length;i++){const site=b.sites[i],near=quality!=='light'&&Math.hypot(site.x-player.x,site.z-player.z)<48;if(near===b.detail)b.inst.setMatrixAt(count++,b.matrices[i]);}b.inst.count=count;b.inst.instanceMatrix.needsUpdate=true;b.inst.boundingSphere=null;b.inst.computeBoundingSphere();}}

 function flush(){for(const {parent,m,list} of batches.values()){const g=mergeGeometries(list,false);list.forEach(a=>a.dispose());if(!g)continue;const mesh=new T.Mesh(g,m);mesh.castShadow=!/Earth|Horizon|cobble|foliage/.test(m.name);mesh.receiveShadow=true;parent.add(mesh);}batches.clear();}
 flora.finish();const groundCover=createGroundCover(root,zone,quality);
 flush();const ready=parisModels().catch(e=>{if(!dead)onError('Chargement du quartier incomplet : '+e.message);throw e;});
 return{root,ready,memory,update(s,vision,player,time){flags=s.flags;updateBuildingLod(time,player);flora.tick(time);groundCover.update(time,player);if(leaf.userData.shader)leaf.userData.shader.uniforms.windTime.value=time;restored.visible=!!flags.justice;corruption.visible=!flags.justice;doorway.visible=!flags.trial;if(circlePart)circlePart.visible=!!flags.returned;slots.forEach((slot,i)=>{slot.visible=i===0?!!flags.justice:true;slot.material=i===0&&flags.returned?blue:bronze;});for(const g of memory.children)g.visible=vision&&Math.hypot(player.x-g.position.x,player.z-g.position.z)<(s.bond>=3?12:9);for(const a of animated){if(a.type==='portal'){a.object.material.opacity=.62+Math.sin(time*.8)*.06;}else{a.object.rotation.y=time;a.object.position.y=.6+Math.sin(time*2)*.07;}}},dispose(){dead=true;groundCover.dispose();flora.dispose();root.removeFromParent();const geometry=new Set(),material=new Set(owned);root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))material.add(m);});ready.catch(()=>{}).finally(()=>{for(const a of assets)a.scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))material.add(m);});geometry.forEach(g=>g.dispose());material.forEach(m=>m.dispose());});textures.forEach(t=>t?.dispose());Object.values(geo).forEach(g=>g.dispose());}};
}
