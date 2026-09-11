import * as THREE from 'three';
export function surfaceTexture(kind='stone'){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=31;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle=kind==='stone'?'#969a94':kind==='earth'?'#d3cec1':'#e4e2dc';c.fillRect(0,0,256,256);
 if(kind==='stone')for(let row=0;row<8;row++)for(let col=-1;col<9;col++){const v=145+Math.floor(random()*55);c.fillStyle=`rgb(${v},${v},${v-5})`;const x=col*34+(row%2)*17;c.fillRect(x+1,row*32+1,31,29);c.fillStyle='#ffffff22';c.fillRect(x+2,row*32+2,29,1);}
 for(let i=0;i<5000;i++){c.fillStyle=random()>.5?'#ffffff16':'#161e2011';c.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
 if(kind==='earth')for(let i=0;i<220;i++){const x=random()*256,y=random()*256,r=.4+random()*1.8;c.fillStyle=random()>.5?'#77736538':'#faf6e445';c.beginPath();c.ellipse(x,y,r,r*.65,random()*3,0,Math.PI*2);c.fill();}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.repeat.set(kind==='stone'?1:2,kind==='stone'?1:2);return texture;
}
