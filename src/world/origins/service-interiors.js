import * as T from 'three';
export const serviceRooms=layout=>['atelier','refuge'].map(id=>{const p=layout.points.find(p=>p.id===id);return {id,x:p.x,z:p.z-3.5,w:7,d:7};});
export function serviceObstacles(layout){return serviceRooms(layout).flatMap(r=>[
 {x:r.x,z:r.z-3.5,w:7,d:.3,h:3.5},...[-1,1].flatMap(side=>[
 {x:r.x+side*3.5,z:r.z,w:.3,d:7,h:3.5},
 {x:r.x+side*2.35,z:r.z+3.5,w:2.3,d:.3,h:3.5}]),
 ...(r.id==='atelier'?[{x:r.x-1.9,z:r.z,w:1.6,d:2.1,h:1}]:[-1,1].map(side=>({x:r.x+side*2.1,z:r.z-1.2,w:1.5,d:2.4,h:.6})))
]);}
export function createServiceInteriors(layout,country,occlusion){
 const root=new T.Group(),geometries=[],materials=[],textures=[],roofs=[];
 const box=new T.BoxGeometry(1,1,1);geometries.push(box);
 const mat=(color,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness:metalness?.4:.92,metalness});materials.push(m);return m;};
 const wall=mat(country.stone),wood=mat('#715642'),cloth=mat(country.paving),blue=mat(country.sky),metal=mat('#a38c62',.5),linen=mat('#e7dfcc');occlusion?.apply(wall);
 function add(m,x,y,z,w,h,d){const o=new T.Mesh(box,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 for(const r of serviceRooms(layout)){
  add(wood,r.x,.015,r.z,7,.03,7);add(wall,r.x,1.75,r.z-3.5,7,3.5,.3);
  for(const side of [-1,1]){add(wall,r.x+side*3.5,1.75,r.z,.3,3.5,7);add(wall,r.x+side*2.35,1.75,r.z+3.5,2.3,3.5,.3);add(wood,r.x+side*1.25,1.55,r.z+3.65,.12,3.1,.16);}
  add(wood,r.x,3.12,r.z+3.65,2.65,.16,.2);
  const roof=add(wall,r.x,3.65,r.z,7.5,.3,7.5);roofs.push({r,roof});
  for(const side of [-1,1]){add(metal,r.x+side*2.6,2.45,r.z+3.76,.2,.4,.2);const glow=mat('#ffd992');glow.emissive.set('#ffcd70');glow.emissiveIntensity=.7;add(glow,r.x+side*2.6,2.45,r.z+3.87,.14,.24,.06);}
  if(r.id==='atelier'){
   add(wood,r.x-1.9,.94,r.z,1.6,.14,2.1);for(const side of [-1,1])for(const end of [-1,1])add(wood,r.x-1.9+side*.62,.45,r.z+end*.85,.12,.9,.12);
   for(let i=0;i<4;i++)add(i%2?blue:linen,r.x-1.9,1.05+i*.07,r.z-.4,.8,.06,.65);
   for(let level=0;level<3;level++){add(wood,r.x+1.9,.55+level*.7,r.z-2.9,2.1,.12,.55);for(let i=0;i<3;i++)add(i%2?cloth:blue,r.x+1.2+i*.65,.76+level*.7,r.z-2.9,.46,.28,.4);}
   add(metal,r.x-1.9,1.07,r.z+.6,.55,.06,.09);
  }else{
   for(const side of [-1,1]){add(wood,r.x+side*2.1,.3,r.z-1.2,1.5,.45,2.4);add(linen,r.x+side*2.1,.58,r.z-1.2,1.4,.2,2.3);add(blue,r.x+side*2.1,.71,r.z-.8,1.4,.05,1.5);add(linen,r.x+side*2.1,.76,r.z-2,.9,.18,.45);}
   add(wood,r.x,1,r.z-3,1.2,.14,.65);add(cloth,r.x,.045,r.z+1,2.1,.035,2.2);
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#23383b';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#c1a574';ctx.strokeRect(5,5,502,86);ctx.font='600 36px sans-serif';ctx.textAlign='center';ctx.fillStyle='#eee2c6';ctx.fillText(r.id==='atelier'?'ATELIER TEXTILE':'MAISON DE REPOS',256,61);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.push(map);const sign=new T.MeshBasicMaterial({map});materials.push(sign);add(sign,r.x,3.38,r.z+3.72,2.8,.48,.05);
 }
 return {root,update(p){for(const {r,roof} of roofs)roof.visible=Math.abs(p.x-r.x)>3.8||Math.abs(p.z-r.z)>3.8;},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
