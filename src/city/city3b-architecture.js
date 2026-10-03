/** Shared, batched shapes: authored details without texture downloads. */
export function matrixTree({box,shape,sphereGeo,cylinderGeo},parent,x,z,size=1){
 box(parent,0x263947,x,size*.65,z,.15*size,1.3*size,.15*size);
 for(const side of [-1,1]){const branch=box(parent,0xc5ab73,x+side*.22*size,size*1.1,z,.08*size,.6*size,.08*size);branch.rotation.z=side*-.65;}
 shape(parent,sphereGeo,0x246d83,x,size*1.65,z,.78*size,.9*size,.78*size);
 for(const y of [1.2,1.6,2])shape(parent,cylinderGeo,0x55bff4,x,y*size,z,.66*size,.035*size,.66*size,true);
 box(parent,0x80e3ee,x,size*.7,z+.09*size,.035*size,size,.04*size,true);
}
export function buildingDetails({box,shape,sphereGeo},group,{w,d,height,kind}){
 if(kind==='green')return;
 const blue=0x388dac,gold=0xc7ad79,dark=0x253a46;
 for(const side of [-1,1]){
  box(group,gold,side*w*.39,height*.52,0,.035,height*.95,d*.76);
  box(group,blue,side*w*.399,height*.5,0,.025,height*.55,d*.48);
 }
 box(group,dark,0,height+.22,0,w*.65,.26,d*.6);
 box(group,gold,0,height+.37,0,w*.7,.035,d*.65);
 const levels=Math.min(4,Math.max(1,Math.floor(height)));
 for(let i=1;i<=levels;i++)box(group,gold,0,height*i/(levels+1),d*.383,w*.79,.025,.03);
 box(group,dark,0,height*.36,d*.43,w*.3,.08,d*.16);
 box(group,0x63c6ed,0,height*.41,d*.435,w*.28,.025,.04,true);
 if(w>=3&&d>=3){
  box(group,0x496473,-w*.18,height+.43,-d*.14,w*.26,.09,d*.25);
  for(const side of [-1,1]){box(group,dark,side*w*.23,height+.45,d*.16,w*.16,.14,d*.17);shape(group,sphereGeo,0x3d8990,side*w*.23,height+.61,d*.16,w*.085,.2,d*.08);}
 }
 if(kind==='commerce'){
  box(group,0x3e92aa,0,height*.65,d*.4,w*.65,.16,.045,true);
  for(const side of [-1,1])box(group,gold,side*w*.4,height*.32,d*.43,.035,height*.58,.035);
 }
}
