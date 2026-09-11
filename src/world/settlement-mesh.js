import * as THREE from 'three';
import {REGIONS} from './settlements.js';
import {surfaceTexture} from './surfaces.js';

export function addSettlement({region,field,root,shape,box,cylinder,ball,geo,mat,asset,resident,owned}){
 const c=REGIONS[region],{height,roads,squares,fields,biome}=field,texture=surfaceTexture('stone');if(texture)owned.push(texture);
 const paving=mat(c.paving,{map:texture,bumpMap:texture,bumpScale:.085,roughness:.96}),earth=mat(c.earth),wood=mat('#72604b'),iron=mat('#3c5352',{metalness:.55});
 function strip(points,width,material){const verts=[],uv=[],indices=[],lift=material===paving?.08:.035;let v=0;
  for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/2)),nx=-(b.z-a.z)/length*width/2,nz=(b.x-a.x)/length*width/2;
   for(let j=0;j<steps;j++){const start=v;for(const [t,side] of [[j/steps,-1],[j/steps,1],[(j+1)/steps,-1],[(j+1)/steps,1]]){const x=a.x+(b.x-a.x)*t+nx*side,z=a.z+(b.z-a.z)*t+nz*side;verts.push(x,height(x,z)+lift,z);uv.push(x/5,z/5);v++;}indices.push(start,start+1,start+2,start+1,start+3,start+2);}
  }const g=geo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;root.add(mesh);
 }
 for(const road of roads)strip(road.points,road.width,road.kind==='street'?paving:earth);
 for(const p of squares){const g=geo(new THREE.CircleGeometry(p.r,48));g.rotateX(-Math.PI/2);const a=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<a.count;i++){a.setY(i,height(a.getX(i)+p.x,a.getZ(i)+p.z)+.052);uv.setXY(i,(a.getX(i)+p.x)/5,(a.getZ(i)+p.z)/5);}g.computeVertexNormals();const square=shape(g,paving,p.x,0,p.z);square.castShadow=false;}
 // An open artisan courtyard: usable entrance, market stalls, signs and seating.
 const workshop=field.anchors.find(a=>a.type==='atelier');if(workshop){const {x,z}=workshop;
  for(const side of [-1,1]){const stall=asset('Market',x+side*8,z-4,.92,side<0?.4:-.4);for(const i of [0,1,2])shape(box,mat(['#b5865f','#74918b','#b29868'][i]),x+side*8+(i-1)*.6,height(x,z)+1.2,z-3,.52,.32,.7);}
  for(const dx of [-6,6]){asset('Bench',x+dx,z+4,.8,0);asset('Lantern',x+dx,z+2,.9,0);}
  resident(x+3,z+1,'#d2a96e',root,'artisan');
  const sign=shape(box,wood,x,height(x,z)+1.4,z-3,.1,2.8,.1);shape(box,mat('#c4ad7f'),x,height(x,z)+2.5,z-3,2.8,.85,.16);
  for(let i=-1;i<=1;i++)shape(box,mat('#eee0b1'),x+i*.64,height(x,z)+2.5,z-2.89,.18,.45,.07);
 }
 const city=field.anchors.find(a=>a.id.endsWith(':survey:city'));if(city){const {x,z}=city,y=height(x,z);for(const dx of [-4,4])asset('Bench',x+dx,z+2,.8,0);shape(cylinder,mat('#c5c0ab'),x,y+.25,z-3,1.5,.5,1.5);shape(cylinder,mat('#698f8e'),x,y+.5,z-3,1.18,.08,1.18);shape(cylinder,mat('#d4cab0'),x,y+1,z-3,.25,1.3,.25);resident(x+2,z+1,'#af9981',root,'woman');}
 for(const f of fields){
  const natural=['rocks','forest'].includes(f.kind),jitter=(row,col,n)=>(Math.sin(row*97.3+col*41.7+n*13.9+biome.seed)*41721.31)%1;
  const forward={x:Math.cos(biome.angle),z:Math.sin(biome.angle)},side={x:-forward.z,z:forward.x},point=(x,z)=>({x:f.x+forward.x*x+side.x*z,z:f.z+forward.z*x+side.z*z});
  for(let row=-2;row<=2;row++){const a=point(-f.w/2,row*f.h/5),b=point(f.w/2,row*f.h/5);if(!natural)strip([a,b],.65,mat(f.kind==='oasis'?'#669a94':'#857653'));
   for(let col=-2;col<=2;col++){if(natural&&jitter(row,col,0)>.66)continue;const p=point(col*f.w/5+(natural?jitter(row,col,1)*2.8:0),row*f.h/5+(natural?jitter(row,col,2)*2.8:0)),y=height(p.x,p.z);
    if(f.kind==='rocks'){const tall=4+Math.abs(jitter(row,col,3))*6,width=.9+tall*.12;const rock=shape(geo(new THREE.ConeGeometry(1,1,7)),mat('#c6aa84'),p.x,y+tall/2,p.z,width,tall,width*.84);rock.rotation.y=jitter(row,col,4)*3;shape(ball,mat('#957a62'),p.x,y+tall*.9,p.z,width*.78,.35+tall*.03,width*.6);}
    else if(f.kind==='forest'){asset('Pine',p.x,p.z,.6+Math.abs(jitter(row,col,3))*.85,jitter(row,col,4)*3);}
    else if(f.kind==='vineyard'){shape(cylinder,wood,p.x,y+.8,p.z,.065,1.6,.065);shape(ball,mat('#667b44'),p.x,y+1.25,p.z,1,.45,.65);for(let i=0;i<2;i++)shape(ball,mat('#605073'),p.x+i*.25,y+.95,p.z+.4,.14,.25,.14);}
    else if(f.kind==='oasis'){shape(box,mat('#7f9560'),p.x,y+.2,p.z,1.5,.35,1);}
    else if(f.kind==='terrace'){shape(box,mat('#ac8c66'),p.x,y+.1,p.z,1.8,.25,1.4);shape(ball,mat('#7e914e'),p.x,y+.5,p.z,.9,.5,.6);}
    else{shape(cylinder,wood,p.x,y+1,p.z,.17,2,.17);shape(ball,mat(f.kind==='olive'?'#748474':'#6d8752'),p.x,y+2.3,p.z,1.35,1.1,1.3);if(f.kind==='orchard')for(const dx of [-.6,.6])shape(ball,mat('#b97e51'),p.x+dx,y+2.15,p.z+.7,.14);}
   }
  }
  if(!natural)for(const side of [-1,1])for(let i=0;i<6;i++){const p=point(-f.w/2+i*f.w/5,side*(f.h/2+1));shape(box,wood,p.x,height(p.x,p.z)+.6,p.z,.14,1.2,.14);}
 }
 const camp=field.anchors.find(a=>a.id.endsWith(':survey:rural'));if(camp){asset('Market',camp.x+7,camp.z-5,.8,biome.angle);asset('Bench',camp.x-3,camp.z-3,.85,0);resident(camp.x+2,camp.z+1,'#8f9f71',root,'elder');}
 for(const r of roads.filter(r=>r.kind==='street').slice(0,2)){const a=r.points[1],b=r.points[2];resident(a.x,a.z,'#acb4a0',root,'traveler',{a,b});}
 // Street lamps form actual urban blocks; no glowing route imposed on the player.
 for(const road of roads.filter(r=>r.kind==='street'))for(const p of road.points.slice(1,-1)){const x=p.x+road.width/2+1,z=p.z;if(field.anchors.some(a=>Math.hypot(a.x-x,a.z-z)<3))continue;asset('Lantern',x,z,.9,0);}
}
