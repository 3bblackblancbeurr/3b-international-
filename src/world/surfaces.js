import * as THREE from 'three';

export function surfaceTexture(kind='stone'){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=31+kind.length*17;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const base={stone:'#969a94',limestone:'#c0baa9',earth:'#b8a98b',gravel:'#999384',grass:'#777f5d',timber:'#8c775d',tile:'#a88c78',slate:'#596169',concrete:'#777d80',asphalt:'#4b5052',metal:'#6d7478'}[kind]||'#a8a39a';
 c.fillStyle=base;c.fillRect(0,0,256,256);

 // Large-scale tonal breakup stops materials reading as a single flat color.
 for(let i=0;i<130;i++){
  const x=random()*256,y=random()*256,r=12+random()*54,alpha=3+Math.floor(random()*11);
  c.fillStyle=random()>.5?`rgba(255,255,255,${alpha/255})`:`rgba(8,15,18,${alpha/255})`;
  c.beginPath();c.ellipse(x,y,r,r*(.45+random()*.9),random()*Math.PI,0,Math.PI*2);c.fill();
 }

 if(kind==='stone'||kind==='limestone'||kind==='concrete'){
  const cells=kind==='concrete'?5:8,size=256/cells;
  for(let row=0;row<cells;row++)for(let col=-1;col<cells+1;col++){
   if(kind!=='concrete'){const v=(kind==='limestone'?184:145)+Math.floor(random()*24);c.fillStyle=`rgb(${v},${v},${Math.max(0,v-7)})`;const x=col*size+(row%2)*size*.5;c.fillRect(x+.8,row*size+.8,size-1.6,size-1.6);c.fillStyle='#ffffff17';c.fillRect(x+1.5,row*size+1.5,size-3,1);}
  }
  // Hairline cracks and mineral streaks.
  for(let i=0;i<(kind==='concrete'?24:12);i++){
   let x=random()*256,y=random()*256;c.strokeStyle=random()>.25?'#1b23251f':'#ffffff16';c.lineWidth=.45+random()*.65;c.beginPath();c.moveTo(x,y);
   for(let s=0;s<5;s++){x+=random()*20-10;y+=8+random()*20;c.lineTo(x,y);}c.stroke();
  }
  for(let i=0;i<20;i++){const x=random()*256;c.fillStyle='#313d3f10';c.fillRect(x,random()*90,1+random()*3,55+random()*130);}
 }
 if(['tile','slate','asphalt'].includes(kind)){
  if(kind!=='asphalt')for(let row=0;row<16;row++)for(let col=-1;col<13;col++){const v=(kind==='slate'?80:145)+Math.floor(random()*42);c.fillStyle=`rgb(${v},${v},${v+(kind==='tile'?6:12)})`;c.fillRect(col*24+(row%2)*12+1,row*16+1,22,14);c.fillStyle='#00000030';c.fillRect(col*24+(row%2)*12+1,row*16+13,22,2);}
  for(let i=0;i<(kind==='asphalt'?3000:900);i++){const v=50+Math.floor(random()*100);c.fillStyle=`rgba(${v},${v},${v},${kind==='asphalt'?.12:.08})`;const r=.4+random()*(kind==='asphalt'?2.4:1.3);c.fillRect(random()*256,random()*256,r,r);}
 }
 if(kind==='timber'){
  c.fillStyle='#8e765a';c.fillRect(0,0,256,256);
  for(let x=0;x<256;x+=32){
   c.fillStyle='#35271928';c.fillRect(x,0,1.5,256);
   for(let j=0;j<14;j++){c.strokeStyle=j%3?'#3f2c1e24':'#f2ddba18';c.lineWidth=.6+random()*1.2;c.beginPath();const sx=x+random()*30;c.moveTo(sx,0);c.bezierCurveTo(x+random()*32,70,x+random()*32,170,x+random()*32,256);c.stroke();}
   if(random()>.35){const kx=x+6+random()*20,ky=30+random()*190;c.strokeStyle='#2f211b38';c.beginPath();c.ellipse(kx,ky,3+random()*5,1.5+random()*3,random()*Math.PI,0,Math.PI*2);c.stroke();}
  }
 }
 if(kind==='metal'){
  for(let y=0;y<256;y+=2){c.fillStyle=y%4?'#ffffff08':'#0d151909';c.fillRect(0,y,256,1);}
  for(let i=0;i<80;i++){c.strokeStyle=random()>.5?'#ffffff12':'#00000018';c.beginPath();const y=random()*256;c.moveTo(random()*110,y);c.lineTo(150+random()*106,y+(random()-.5)*2);c.stroke();}
 }
 for(let i=0;i<5000;i++){c.fillStyle=random()>.5?'#ffffff12':'#161e2010';c.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
 if(kind==='earth'||kind==='gravel')for(let i=0;i<(kind==='gravel'?2100:320);i++){const x=random()*256,y=random()*256,r=.4+random()*(kind==='gravel'?3.2:1.9);c.fillStyle=random()>.5?'#6d675638':'#faf3dd3c';c.beginPath();c.ellipse(x,y,r,r*.65,random()*3,0,Math.PI*2);c.fill();}
 if(kind==='grass')for(let i=0;i<10500;i++){
  const x=random()*256,y=random()*256,angle=random()*Math.PI*2,length=2+random()*8;
  c.strokeStyle=random()>.5?'#35402c30':'#e8e7bb27';c.lineWidth=.5+random()*.55;
  for(const ox of [-256,0,256])for(const oy of [-256,0,256]){c.beginPath();c.moveTo(x+ox,y+oy);c.lineTo(x+ox+Math.cos(angle)*length,y+oy+Math.sin(angle)*length);c.stroke();}
 }

 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 texture.repeat.set(['stone','limestone','concrete'].includes(kind)?1:2,['stone','limestone','concrete'].includes(kind)?1:2);
 return texture;
}
