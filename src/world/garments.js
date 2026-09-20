import {hoodGeometry,hoodHemGeometry} from './hood.js';
import {avatarCompatibility} from './avatar-compatibility.js';
import {FABRIC_CATALOG} from './avatar-capabilities.js';
import * as THREE from 'three';

export function garmentPattern(recipe){
 if(recipe.pattern==='uni'||typeof document==='undefined')return null;
 const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
 const accent=recipe.accentColor||'#d7bd83',intensity=Math.max(.15,Math.min(1,recipe.patternIntensity??.8));
 ctx.globalAlpha=intensity;ctx.fillStyle=accent;ctx.strokeStyle=accent;
 if(recipe.pattern==='bandes')for(let i=0;i<8;i++)ctx.fillRect(0,i*32+16,256,7);
 if(recipe.pattern==='damier')for(let x=0;x<8;x++)for(let y=0;y<8;y++)if((x+y)%2===0)ctx.fillRect(x*32,y*32,31,31);
 if(recipe.pattern==='insigne'){ctx.fillRect(0,20,256,10);ctx.fillRect(0,225,256,10);ctx.font='bold 42px serif';ctx.textAlign='center';for(const x of [64,192])ctx.fillText('3B',x,145);}
 if(recipe.pattern==='broderie')for(let x=0;x<8;x++)for(let y=0;y<8;y++){ctx.save();ctx.translate(x*32+16,y*32+16);ctx.rotate(Math.PI/4);ctx.lineWidth=2;ctx.strokeRect(-6,-6,12,12);ctx.restore();}
 if(recipe.pattern==='matrix'){
  ctx.font='bold 15px monospace';ctx.textAlign='center';
  for(let x=12;x<256;x+=22)for(let y=12;y<256;y+=20){const value=((x*17+y*31)/2)%10|0;ctx.globalAlpha=intensity*(.28+((x+y)%5)*.12);ctx.fillText(String(value),x,y);}
  ctx.globalAlpha=intensity*.35;for(let x=11;x<256;x+=44)ctx.fillRect(x,0,2,256);
 }
 if(recipe.pattern==='zellige'){
  ctx.lineWidth=3;ctx.globalAlpha=intensity*.9;
  for(let x=0;x<288;x+=32)for(let y=0;y<288;y+=32){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeRect(-11,-11,22,22);ctx.restore();}
  ctx.globalAlpha=intensity*.35;for(let x=16;x<256;x+=32)for(let y=16;y<256;y+=32){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
 }
 if(recipe.pattern==='tonal'){
  ctx.globalAlpha=intensity*.24;
  for(let i=-256;i<512;i+=26){ctx.save();ctx.translate(i,0);ctx.rotate(-Math.PI/4);ctx.fillRect(0,-180,8,600);ctx.restore();}
 }
 if(recipe.pattern==='geo'){
  ctx.globalAlpha=intensity*.72;ctx.lineWidth=2;
  for(let x=0;x<256;x+=48)for(let y=0;y<256;y+=42){ctx.beginPath();ctx.moveTo(x,y+36);ctx.lineTo(x+24,y);ctx.lineTo(x+48,y+36);ctx.closePath();ctx.stroke();}
 }
 ctx.globalAlpha=1;
 const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;map.repeat.setScalar(recipe.patternScale||1);map.center.set(.5,.5);map.rotation=(recipe.patternRotation||0)*Math.PI/180;return map;
}

export function fitGarments(model,recipe){
 const geometries=[],materials=[],cloth=[],pieces=[],compat=avatarCompatibility(recipe),adjust=compat.adjustments;
 const roughness=FABRIC_CATALOG[recipe.fabric]?.roughness??.92;
 const material=(color,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness:metalness?.4:roughness,metalness,side:THREE.DoubleSide});materials.push(m);return m;},fabric=material(recipe.cloth),accent=material(recipe.accentColor),leather=material(recipe.bootColor),gold=material(recipe.metalColor||'#c9ad75',.6),outerFabric=material(recipe.outerColor||recipe.cloth);
 model.updateWorldMatrix(true,true);const bone=name=>model.getObjectByName(name),location=name=>{const v=new THREE.Vector3();bone(name)?.getWorldPosition(v);return model.worldToLocal(v);};
 const head=location('Head'),chest=location('spine_03'),waist=location('pelvis');
 function attach(geometry,mat,position,scale,boneName='spine_03'){geometries.push(geometry);const m=new THREE.Mesh(geometry,mat);pieces.push(m);m.position.copy(position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;model.add(m);model.updateWorldMatrix(true,true);bone(boneName)?.attach(m);return m;}
 outerFabric.roughness=fabric.roughness=roughness;
 const at=(v,x=0,y=0,z=0)=>new THREE.Vector3(v.x+x,v.y+y,v.z+z),box=(mat,p,scale,boneName)=>attach(new THREE.BoxGeometry(1,1,1),mat,p,scale,boneName);
 if(recipe.bag){const z=-.22+adjust.bagDepth;box(leather,at(chest,0,-.17,z),[.3,.36,.16]);box(accent,at(chest,0,-.23,z-.10),[.23,.12,.06]);for(const s of [-1,1])box(leather,at(chest,s*.13,-.12,.08),[.036,.38,.025]);box(gold,at(chest,0,-.05,z-.10),[.065,.035,.025]);}
 if(recipe.headwear==='beret'){const beret=attach(new THREE.SphereGeometry(1,16,8),accent,at(head,0,.23,.01),[.22,.075,.19],'Head');beret.rotateZ(.13);}
 if(recipe.headwear==='brim'){attach(new THREE.CylinderGeometry(1,1,1,20),leather,at(head,0,.2,.01),[.27,.025,.24],'Head');attach(new THREE.CylinderGeometry(.9,1,1,20),fabric,at(head,0,.27,.01),[.17,.14,.15],'Head');}
 if(recipe.headwear==='hood'){attach(hoodGeometry(),fabric,at(head,0,.025,0),[.65*(recipe.hoodFit||1),.68*(recipe.hoodFit||1),.65*(recipe.hoodFit||1)],'Head');attach(hoodHemGeometry(),fabric,at(head,0,.025,0),[.65*(recipe.hoodFit||1),.68*(recipe.hoodFit||1),.65*(recipe.hoodFit||1)],'Head');}
 if(recipe.belt&&recipe.belt!=='none'){const belt=attach(new THREE.TorusGeometry(.2,.018,6,28),leather,at(waist,0,.09,0),[1,.7,1],'pelvis');belt.rotateX(Math.PI/2);box(gold,at(waist,0,.09,.19),[.065,.045,.025],'pelvis');if(recipe.belt==='utility')for(const side of [-1,1])box(leather,at(waist,side*.19,.03,.08),[.075,.12,.075],'pelvis');}
 if(recipe.pendant){const z=.205+adjust.pendantDepth;attach(new THREE.TorusGeometry(.085,.005,6,24),gold,at(chest,0,.015,z),[.8,1,1]);attach(new THREE.OctahedronGeometry(.027),gold,at(chest,0,-.08,z+.005),[.8,1.3,.4]);}
 if(recipe.outer==='scarf'){const scarf=attach(new THREE.TorusGeometry(.13,.044,8,22),recipe.outerColor?outerFabric:accent,at(chest,0,.075,.025),[1,1,1]);scarf.rotateX(Math.PI/2);box(recipe.outerColor?outerFabric:accent,at(chest,.09,-.13,.18),[.085,.35,.032]);}
 if(recipe.outer==='cape'||recipe.outer==='apron'){
  const cape=recipe.outer==='cape',top=at(chest,0,cape?.035:-.02,cape?-.17-adjust.capeClearance:.25),length=cape?Math.max(.55,chest.y-waist.y+.3)*(recipe.capeLength||1):Math.max(.38,chest.y-waist.y+.12),geometry=new THREE.PlaneGeometry(cape?.5:.28,length,6,8);geometry.translate(0,-length/2,0);const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){const progress=-positions.getY(i)/length;positions.setX(i,positions.getX(i)*(1+progress*(cape?.35:.12)));positions.setZ(i,(cape?-1:1)*(.08*progress+.012*Math.cos(positions.getX(i)*35)));}
  geometry.computeVertexNormals();const piece=attach(geometry,recipe.outerColor?outerFabric:cape?fabric:accent,top,[1,1,1]);cloth.push({mesh:piece,base:new Float32Array(positions.array),length,cape});for(const s of [-1,1])box(gold,at(chest,s*.13,.04,.15),[.035,.035,.025]);if(!cape)box(fabric,at(chest,0,-.23,.303),[.13,.09,.025]);
 }
 let motion=0;
 return{
  update(time,{speed=0,turn=0}={}){
   const target=Math.min(1,Math.max(0,speed/5.5));motion+=(target-motion)*.12;
   for(const c of cloth){const p=c.mesh.geometry.attributes.position,amp=(c.cape?.018:.012)+motion*(c.cape?.045:.026),rate=2.6+motion*3.8;for(let i=0;i<p.count;i++){const t=-c.base[i*3+1]/c.length;p.setZ(i,c.base[i*3+2]+Math.sin(time*rate+t*4.4)*amp*t+Math.min(.05,Math.abs(turn)*.018)*t);p.setX(i,c.base[i*3]+Math.max(-.04,Math.min(.04,turn*.012))*t);}p.needsUpdate=true;}
  },
  dispose(){pieces.forEach(p=>p.removeFromParent());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 };
}
