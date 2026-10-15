// Deterministic sculptural tree. Decorative wood never asserts a genealogical link.
import { Vector3, CatmullRomCurve3 } from 'three';
const v=(x,y,z)=>new Vector3(x,y,z);
export function createSculpture(nodes){
 let seed=37013;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const wood=[],leaves=[],positions=new Map();
 const limb=(points,r1,r2)=>{const curve=new CatmullRomCurve3(points);wood.push({points,r1,r2,samples:curve.getPoints(22)});return curve;};
 limb([v(0,-2,0),v(-3,15,1),v(3,34,-1),v(0,55,0)],7.2,1.5);
 for(let i=0;i<11;i++){const a=i*Math.PI*2/11;limb([v(Math.cos(a)*3,3,Math.sin(a)*3),v(Math.cos(a)*13,-1,Math.sin(a)*12),v(Math.cos(a)*31,-3,Math.sin(a)*28)],3.2,.12);}
 const tips=[];
 for(let i=0;i<9;i++){
  const a=i*2.39996+.3,reach=53+random()*13,startY=21+i*2.6;
  const end=v(Math.cos(a)*reach,67+random()*17,Math.sin(a)*reach*.64);
  const elbow=v(Math.cos(a)*reach*.42,49+random()*9,Math.sin(a)*reach*.32);
  const mainCurve=limb([v(0,startY,0),elbow,end],3.7-i*.12,.36);
  for(let j=0;j<7;j++){
   const t=.25+j*.09,base=mainCurve.getPointAt(t);
   const angle=a+(j%2?1:-1)*(.45+random()*.62);
   const tip=v(Math.cos(angle)*(reach*(.68+random()*.43)),67+random()*25,Math.sin(angle)*reach*.65);
   limb([base,base.clone().lerp(tip,.5).add(v(0,6,0)),tip],1.15,.09);tips.push(tip);
   for(let k=0;k<22;k++){
    const p=tip.clone().add(v((random()-.5)*25,(random()-.5)*21,(random()-.5)*24));
    leaves.push({position:p,size:1.9+random()*2.2,angle:random()*Math.PI,color:random(),phase:random()*6.28});
   }
  }
 }
 const roots=nodes.filter(n=>['adam','eve','cain','abel','seth'].includes(n.id));
 roots.forEach((n,i)=>positions.set(n.id,v((i-2)*10,7+i*3,12+(i%2)*7)));
 nodes.filter(n=>!positions.has(n.id)).forEach((n,i)=>{
  const tip=tips[(i*17)%tips.length];const layer=Math.floor(i/tips.length);
  positions.set(n.id,tip.clone().add(v(Math.cos(i*2.4)*(5+layer*4),(layer-1)*5,Math.sin(i*2.4)*7)));
 });
 for(const [id,p] of [['noe',v(-2,31,9)],['abraham',v(0,51,9)],['jacob',v(-27,64,19)],['moise',v(-51,78,11)],['david',v(33,70,14)],['jesus',v(39,93,12)],['marie',v(54,89,8)],['muhammad',v(-61,91,8)]])if(positions.has(id))positions.set(id,p);
 return {wood,leaves,positions};
}
export function renderSoftwareTree(ctx,width,height,camera,model,{selected,related=new Set(),visibleIds,showConnections=true,edges=[],project}={}){
 ctx.clearRect(0,0,width,height);
 const halo=ctx.createRadialGradient(width*.5,height*.45,0,width*.5,height*.45,width*.6);halo.addColorStop(0,'#18352f55');halo.addColorStop(.65,'#0e201b22');halo.addColorStop(1,'#06100f00');ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
 const commands=[];
 for(const w of model.wood){
  const points=w.samples.map(project);
  if(points.every(p=>p.visible))commands.push({z:points.reduce((sum,p)=>sum+p.depth,0)/points.length,kind:'wood',points,r1:w.r1,r2:w.r2});
 }
 for(const l of model.leaves){const p=project(l.position);if(p.visible)commands.push({z:p.depth,kind:'leaf',p,l});}
 commands.sort((a,b)=>b.z-a.z);
 // Grounded elliptical shadow and a fine plinth, both transformed with the camera.
 const base=project(new Vector3(0,-3,0));if(base.visible){ctx.save();ctx.translate(base.x,base.y+8);ctx.scale(1,.19);const shadow=ctx.createRadialGradient(0,0,0,0,0,70*base.scale);shadow.addColorStop(0,'#000c');shadow.addColorStop(1,'#0000');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,70*base.scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b3965950';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,35*base.scale,31*base.scale,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const c of commands){
  if(c.kind==='wood'){
   const {points,r1,r2}=c,left=[],right=[];
   points.forEach((p,i)=>{const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,length=Math.max(.001,Math.hypot(dx,dy)),radius=Math.max(.25,(r1+(r2-r1)*i/(points.length-1))*p.scale);left.push({x:p.x-dy/length*radius,y:p.y+dx/length*radius});right.push({x:p.x+dy/length*radius,y:p.y-dx/length*radius});});
   const first=points[0],middle=points[Math.floor(points.length/2)],radius=Math.max(1,r1*first.scale);
   const shade=ctx.createLinearGradient(first.x-radius*1.1,first.y,first.x+radius*1.1,first.y);shade.addColorStop(0,'#31291b');shade.addColorStop(.32,'#8d794b');shade.addColorStop(.6,'#665435');shade.addColorStop(1,'#302a1d');ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);left.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));right.reverse().forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();
   // One continuous subtle grain highlight avoids ring artifacts at sample joints.
   ctx.strokeStyle='#cfb77920';ctx.lineWidth=Math.max(.3,radius*.09);ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x-radius*.12,p.y):ctx.moveTo(p.x-radius*.12,p.y));ctx.stroke();
  }else{
   const {p,l}=c;const s=l.size*p.scale;if(s<.2)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(l.angle);ctx.fillStyle=l.color>.78?'#c3b475':l.color>.4?'#5a7654':'#314d40';ctx.globalAlpha=.68;ctx.beginPath();ctx.ellipse(0,0,s*.48,s,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
 if(showConnections&&selected){for(const e of edges.filter(e=>e.source===selected||e.target===selected)){
  const a=project(model.positions.get(e.source)),b=project(model.positions.get(e.target));if(!a?.visible||!b?.visible)continue;
  ctx.strokeStyle=e.kind==='union'||e.kind==='sibling'?'#83c2bf':'#e6d4a0';ctx.lineWidth=1.4;ctx.setLineDash(e.kind==='lineage'?[4,5]:[]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2+20,Math.min(a.y,b.y)-25,b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 }}
 for(const [id,pos] of model.positions){if(visibleIds&&!visibleIds.has(id))continue;const p=project(pos);if(!p.visible)continue;const active=id===selected,near=related.has(id);ctx.beginPath();ctx.arc(p.x,p.y,active?5:near?3.5:1.8,0,Math.PI*2);ctx.fillStyle=active?'#fff7cf':near?'#dfc48a':'#c8bd8a99';ctx.shadowBlur=active?17:0;ctx.shadowColor='#e9ce92';ctx.fill();ctx.shadowBlur=0;}
}
