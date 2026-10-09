import {hoodGeometry,hoodHemGeometry} from './hood.js';
import * as THREE from 'three';
import {prepareTintMaterial} from './avatar-material.js';
import {worldArtMaterials} from '../design-system/tokens.js';
export function garmentPattern(recipe){if(recipe.pattern==='uni'||typeof document==='undefined')return null;const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);ctx.fillStyle=recipe.accentColor;
 if(recipe.pattern==='bandes')for(let i=0;i<8;i++)ctx.fillRect(0,i*32+16,256,7);
 if(recipe.pattern==='damier')for(let x=0;x<8;x++)for(let y=0;y<8;y++)if((x+y)%2===0)ctx.fillRect(x*32,y*32,31,31);
 if(recipe.pattern==='insigne'){ctx.fillRect(0,20,256,10);ctx.fillRect(0,225,256,10);ctx.font='bold 42px serif';ctx.textAlign='center';for(const x of [64,192])ctx.fillText('3B',x,145);}
 if(recipe.pattern==='broderie')for(let x=0;x<8;x++)for(let y=0;y<8;y++){ctx.save();ctx.translate(x*32+16,y*32+16);ctx.rotate(Math.PI/4);ctx.strokeStyle=recipe.accentColor;ctx.lineWidth=2;ctx.strokeRect(-6,-6,12,12);ctx.restore();}
 const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;map.repeat.setScalar(recipe.patternScale||1);return map;
}
export function fitGarments(model,recipe,{reducedMotion=false}={}){const geometries=[],materials=[],cloth=[];
 const material=(color,surface='cloth')=>{const m=new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide});prepareTintMaterial(m,{surface,fabric:recipe.fabric,tint:false});materials.push(m);return m;},fabric=material(recipe.cloth),accent=material(recipe.accentColor),leather=material(recipe.bootColor,'leather'),gold=material(recipe.metalColor||worldArtMaterials.travellerMetal,'metal'),outerFabric=material(recipe.outerColor||recipe.cloth);
 model.updateWorldMatrix(true,true);const bone=name=>model.getObjectByName(name),location=name=>{const v=new THREE.Vector3();bone(name)?.getWorldPosition(v);return model.worldToLocal(v);};
 const head=location('Head'),chest=location('spine_03'),waist=location('pelvis');
 function attach(geometry,mat,position,scale,boneName='spine_03'){geometries.push(geometry);const m=new THREE.Mesh(geometry,mat);m.position.copy(position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;model.add(m);model.updateWorldMatrix(true,true);bone(boneName)?.attach(m);return m;}
 const at=(v,x=0,y=0,z=0)=>new THREE.Vector3(v.x+x,v.y+y,v.z+z),box=(mat,p,scale,boneName)=>attach(new THREE.BoxGeometry(1,1,1),mat,p,scale,boneName);
 if(recipe.bag){box(leather,at(chest,0,-.17,-.22),[.3,.36,.16]);box(accent,at(chest,0,-.23,-.32),[.23,.12,.06]);for(const s of [-1,1])box(leather,at(chest,s*.13,-.12,.08),[.036,.38,.025]);box(gold,at(chest,0,-.05,-.32),[.065,.035,.025]);}
 if(recipe.headwear==='beret'){const beret=attach(new THREE.SphereGeometry(1,16,8),accent,at(head,0,.23,.01),[.22,.075,.19],'Head');beret.rotateZ(.13);}
 if(recipe.headwear==='brim'){attach(new THREE.CylinderGeometry(1,1,1,20),leather,at(head,0,.2,.01),[.27,.025,.24],'Head');attach(new THREE.CylinderGeometry(.9,1,1,20),fabric,at(head,0,.27,.01),[.17,.14,.15],'Head');}
 if(recipe.headwear==='hood'){attach(hoodGeometry(),fabric,at(head,0,.025,0),[.65*(recipe.hoodFit||1),.68*(recipe.hoodFit||1),.65*(recipe.hoodFit||1)],'Head');attach(hoodHemGeometry(),fabric,at(head,0,.025,0),[.65*(recipe.hoodFit||1),.68*(recipe.hoodFit||1),.65*(recipe.hoodFit||1)],'Head');}
 if(recipe.belt&&recipe.belt!=='none'){const belt=attach(new THREE.TorusGeometry(.2,.018,6,28),leather,at(waist,0,.09,0),[1,.7,1],'pelvis');belt.rotateX(Math.PI/2);box(gold,at(waist,0,.09,.19),[.065,.045,.025],'pelvis');if(recipe.belt==='utility')for(const side of [-1,1])box(leather,at(waist,side*.19,.03,.08),[.075,.12,.075],'pelvis');}
 if(recipe.pendant){attach(new THREE.TorusGeometry(.085,.005,6,24),gold,at(chest,0,.015,.205),[.8,1,1]);attach(new THREE.OctahedronGeometry(.027),gold,at(chest,0,-.08,.21),[.8,1.3,.4]);}
 if(recipe.outer==='scarf'){const scarf=attach(new THREE.TorusGeometry(.13,.044,8,22),recipe.outerColor?outerFabric:accent,at(chest,0,.075,.025),[1,1,1]);scarf.rotateX(Math.PI/2);box(recipe.outerColor?outerFabric:accent,at(chest,.09,-.13,.18),[.085,.35,.032]);}
 if(recipe.outer==='cape'||recipe.outer==='apron'){
  const cape=recipe.outer==='cape',top=at(chest,0,cape?.035:-.02,cape?-.17:.25),length=cape?Math.max(.55,chest.y-waist.y+.3)*(recipe.capeLength||1):Math.max(.38,chest.y-waist.y+.12),width=cape?.5:.28;
  const geometry=new THREE.PlaneGeometry(width,length,cape?12:6,cape?10:8);geometry.translate(0,-length/2,0);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const progress=-positions.getY(i)/length,x=positions.getX(i),fold=Math.sin((x/width+.5)*Math.PI*6);
   positions.setX(i,x*(1+progress*(cape?.35:.12)));
   positions.setZ(i,(cape?-1:1)*(.09*progress+.024*fold*(.25+.75*progress)));
   // A slight scallop follows the authored folds at the weighted lower hem.
   if(cape)positions.setY(i,positions.getY(i)+.008*Math.cos((x/width+.5)*Math.PI*6)*progress**3);
  }
  geometry.computeVertexNormals();
  const piece=attach(geometry,recipe.outerColor?outerFabric:cape?fabric:accent,top,[1,1,1]);piece.name=cape?'Cape · plis':'Tablier · plis';
  cloth.push({mesh:piece,base:new Float32Array(positions.array),length});
  for(const s of [-1,1])box(gold,at(chest,s*.13,.04,.15),[.035,.035,.025]);if(!cape)box(fabric,at(chest,0,-.23,.303),[.13,.09,.025]);
 }
 return{update(time){if(reducedMotion)return;for(const c of cloth){const p=c.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const t=-c.base[i*3+1]/c.length;p.setZ(i,c.base[i*3+2]+Math.sin(time*3.2+t*4)*.027*t);}p.needsUpdate=true;}},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
