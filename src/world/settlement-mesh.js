import * as THREE from 'three';
import {REGIONS} from './settlements.js';
import {surfaceTexture} from './surfaces.js';

export function addSettlement({region,field,root,shape,box,cylinder,ball,geo,mat,asset,resident,owned}){
 const c=REGIONS[region],{height,roads,squares,fields,biome}=field,texture=surfaceTexture('stone'),soil=surfaceTexture('earth');if(texture)owned.push(texture);if(soil)owned.push(soil);
 const paving=mat(c.paving,{map:texture,bumpMap:texture,bumpScale:.085,roughness:.96}),earth=mat(c.earth,{map:soil,bumpMap:soil,bumpScale:.07}),wood=mat('#72604b'),iron=mat('#3c5352',{metalness:.55});
 function strip(points,width,material){
  const dense=[points[0]],verts=[],uv=[],indices=[],lift=material===paving?.08:.035;
  for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));for(let i=1;i<=steps;i++)dense.push({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps});}
  for(let i=0;i<dense.length;i++){
   const p=dense[i],before=dense[Math.max(0,i-1)],after=dense[Math.min(dense.length-1,i+1)],dx=after.x-before.x,dz=after.z-before.z,length=Math.hypot(dx,dz)||1;
   for(const side of [-1,1]){const x=p.x-dz/length*width/2*side,z=p.z+dx/length*width/2*side;verts.push(x,height(x,z)+lift,z);uv.push(x/5,z/5);}
   if(i){const n=i*2;indices.push(n-2,n-1,n,n-1,n+1,n);}
  }
  const g=geo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;root.add(mesh);
 }

 for(const road of roads){if(road.kind==='street')strip(road.points,road.width+1.3,mat('#ddd0b4'));strip(road.points,road.width,road.kind==='street'?paving:earth);}
 for(const p of squares){const g=geo(new THREE.CircleGeometry(p.r,48));g.rotateX(-Math.PI/2);const a=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<a.count;i++){a.setY(i,height(a.getX(i)+p.x,a.getZ(i)+p.z)+.052);uv.setXY(i,(a.getX(i)+p.x)/5,(a.getZ(i)+p.z)/5);}g.computeVertexNormals();const square=shape(g,paving,p.x,0,p.z);square.castShadow=false;}
 // An open artisan courtyard: usable entrance, market stalls, signs and seating.
 const workshop=field.anchors.find(a=>a.type==='atelier');if(workshop&&region!=='maroc'){const {x,z}=workshop;
  for(const side of [-1,1])for(const i of [0,1,2])shape(box,mat(['#b5865f','#74918b','#b29868'][i]),x+side*8+(i-1)*.6,height(x,z)+1.2,z+1.1,.52,.32,.7);
  for(const dx of [-6,6]){asset('Bench',x+dx,z+4,1.45,0);asset('Lantern',x+dx,z+2,1.35,0);}
  resident(x+3,z+1,'#d2a96e',root,'artisan');
  const sign=shape(box,wood,x,height(x,z)+1.4,z-3,.1,2.8,.1);shape(box,mat('#c4ad7f'),x,height(x,z)+2.5,z-3,2.8,.85,.16);
  for(let i=-1;i<=1;i++)shape(box,mat('#eee0b1'),x+i*.64,height(x,z)+2.5,z-2.89,.18,.45,.07);
 }
 const city=field.anchors.find(a=>a.id.endsWith(':survey:city'));if(city){const {x,z}=city,y=height(x,z);for(const dx of [-4,4])asset('Bench',x+dx,z+2,1.4,0);shape(cylinder,mat('#c5c0ab'),x,y+.25,z-3,1.5,.5,1.5);shape(cylinder,mat('#698f8e'),x,y+.5,z-3,1.18,.08,1.18);shape(cylinder,mat('#d4cab0'),x,y+1,z-3,.25,1.3,.25);resident(x+2,z+1,'#af9981',root,'woman');}
 for(const f of fields.filter(f=>region!=='maroc')){
  const natural=['rocks','forest'].includes(f.kind),jitter=(row,col,n)=>(Math.sin(row*97.3+col*41.7+n*13.9+biome.seed)*41721.31)%1;
  const forward={x:Math.cos(biome.angle),z:Math.sin(biome.angle)},side={x:-forward.z,z:forward.x},point=(x,z)=>({x:f.x+forward.x*x+side.x*z,z:f.z+forward.z*x+side.z*z});
  for(let row=-2;row<=2;row++){const a=point(-f.w/2,row*f.h/5),b=point(f.w/2,row*f.h/5);if(!natural)strip([a,b],.65,mat(f.kind==='oasis'?'#669a94':'#857653'));
   for(let col=-2;col<=2;col++){if(natural&&jitter(row,col,0)>.66)continue;const p=point(col*f.w/5+(natural?jitter(row,col,1)*2.8:0),row*f.h/5+(natural?jitter(row,col,2)*2.8:0)),y=height(p.x,p.z);
    if(f.kind==='rocks'){const tall=4+Math.abs(jitter(row,col,3))*6,width=.9+tall*.12;const rock=shape(geo(new THREE.ConeGeometry(1,1,7)),mat('#c6aa84'),p.x,y+tall/2,p.z,width,tall,width*.84);rock.rotation.y=jitter(row,col,4)*3;shape(ball,mat('#957a62'),p.x,y+tall*.9,p.z,width*.78,.35+tall*.03,width*.6);}
    else if(f.kind==='forest'){asset('Pine',p.x,p.z,.6+Math.abs(jitter(row,col,3))*.85,jitter(row,col,4)*3);}
    else if(f.kind==='vineyard'){shape(cylinder,wood,p.x,y+.8,p.z,.065,1.6,.065);shape(ball,mat('#667b44'),p.x,y+1.25,p.z,1,.45,.65);for(let i=0;i<2;i++)shape(ball,mat('#605073'),p.x+i*.25,y+.95,p.z+.4,.14,.25,.14);}
    else if(f.kind==='oasis'){shape(box,mat('#7f9560'),p.x,y+.2,p.z,1.5,.35,1);}
    else if(f.kind==='terrace'){shape(box,mat('#ac8c66'),p.x,y+.1,p.z,1.8,.25,1.4);shape(ball,mat('#7e914e'),p.x,y+.5,p.z,.9,.5,.6);}
    else{asset(f.kind==='olive'?'Olive':'Tree',p.x,p.z,f.kind==='olive'?.75:.48,jitter(row,col,4)*3);if(f.kind==='orchard')for(const dx of [-.6,.6])shape(ball,mat('#b97e51'),p.x+dx,y+2.15,p.z+.7,.14);}
   }
  }
  if(!natural)for(const side of [-1,1])for(let i=0;i<6;i++){const p=point(-f.w/2+i*f.w/5,side*(f.h/2+1));shape(box,wood,p.x,height(p.x,p.z)+.6,p.z,.14,1.2,.14);}
 }
 const camp=field.anchors.find(a=>a.id.endsWith(':survey:rural'));if(camp){asset('Market',camp.x+7,camp.z-5,1.4,biome.angle);asset('Bench',camp.x-3,camp.z-3,1.4,0);resident(camp.x+2,camp.z+1,'#8f9f71',root,'elder');}
 // Walkers follow the actual curved lanes, with pauses at their ends.
 for(const [index,r] of roads.filter(r=>r.kind==='street').entries())for(let n=0;n<2;n++){
  const a=r.points[0];resident(a.x,a.z,['#657783','#b3966c','#577c70','#8d6659'][(index+n)%4],root,(index+n)%3===0?'woman':n?'artisan':'traveler',{points:r.points,offset:index*11+n*31,speed:2.4+n*.3});
 }
 // Space lamps by travelled distance rather than by spline control points.
 for(const road of roads.filter(r=>r.kind==='street')){let since=0;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1],p=road.points[i],dx=p.x-a.x,dz=p.z-a.z,len=Math.hypot(dx,dz);since+=len;if(since<21)continue;since=0;
   const x=p.x-dz/len*(road.width/2+.5),z=p.z+dx/len*(road.width/2+.5);
   if(field.anchors.some(a=>Math.hypot(a.x-x,a.z-z)<5)||field.buildings.some(b=>Math.hypot(b.x-x,b.z-z)<7))continue;asset('Lantern',x,z,1.35,0);
  }
 }
}
