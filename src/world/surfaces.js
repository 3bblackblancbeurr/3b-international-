import * as THREE from 'three';
export function surfaceTexture(kind='stone'){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=31;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle=kind==='stone'?'#969a94':kind==='earth'?'#d3cec1':'#e4e2dc';c.fillRect(0,0,256,256);
 if(kind==='stone'||kind==='limestone')for(let row=0;row<8;row++)for(let col=-1;col<9;col++){const v=162+Math.floor(random()*20);c.fillStyle=`rgb(${v},${v},${v-5})`;const x=col*32+(row%2)*16;c.fillRect(x+.7,row*32+.7,30.6,30.6);c.fillStyle='#ffffff20';c.fillRect(x+1.5,row*32+1.5,28,1);}
 if(['tile','slate'].includes(kind))for(let row=0;row<16;row++)for(let col=-1;col<13;col++){const v=158+Math.floor(random()*52);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(col*24+(row%2)*12+1,row*16+1,22,14);c.fillStyle='#00000028';c.fillRect(col*24+(row%2)*12+1,row*16+13,22,2);}
 if(kind==='timber'){c.fillStyle='#ddd7c7';c.fillRect(0,0,256,256);for(let x=0;x<256;x+=32){c.fillStyle='#6a5b4630';c.fillRect(x,0,1.5,256);for(let j=0;j<10;j++){c.strokeStyle='#605b4620';c.beginPath();c.moveTo(x+random()*30,0);c.bezierCurveTo(x+random()*32,80,x+random()*32,170,x+random()*32,256);c.stroke();}}}
 for(let i=0;i<5000;i++){c.fillStyle=random()>.5?'#ffffff16':'#161e2011';c.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
 if(kind==='earth'||kind==='gravel')for(let i=0;i<(kind==='gravel'?1800:220);i++){const x=random()*256,y=random()*256,r=.4+random()*(kind==='gravel'?3:1.8);c.fillStyle=random()>.5?'#77736538':'#faf6e445';c.beginPath();c.ellipse(x,y,r,r*.65,random()*3,0,Math.PI*2);c.fill();}
 if(kind==='grass')for(let i=0;i<9500;i++){
  const x=random()*256,y=random()*256,angle=random()*Math.PI*2,length=2+random()*7;
  c.strokeStyle=random()>.5?'#525c4528':'#ffffff38';c.lineWidth=.5+random()*.5;
  // Wrap blades across the texture boundary so tiles join without seams.
  for(const ox of [-256,0,256])for(const oy of [-256,0,256]){c.beginPath();c.moveTo(x+ox,y+oy);c.lineTo(x+ox+Math.cos(angle)*length,y+oy+Math.sin(angle)*length);c.stroke();}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.repeat.set(kind==='stone'?1:2,kind==='stone'?1:2);return texture;
}
