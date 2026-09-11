import * as THREE from 'three';
// An original, deterministic twig atlas. Alpha-tested leaf clusters preserve
// small botanical silhouettes without thousands of separate draw calls.
export function foliageAtlas(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const c=canvas.getContext('2d');
 c.strokeStyle='#757568';c.lineWidth=3;c.beginPath();c.moveTo(128,505);c.bezierCurveTo(140,340,111,200,130,14);c.stroke();
 function leaf(x,y,length,width,angle,tone){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=`rgb(${tone},${tone},${tone-6})`;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-width*.5,-length*.38,-width*.48,-length*.8,0,-length);c.bezierCurveTo(width*.48,-length*.8,width*.5,-length*.38,0,0);c.fill();c.strokeStyle='rgba(65,69,52,.38)';c.lineWidth=.7;c.beginPath();c.moveTo(0,0);c.lineTo(0,-length*.91);c.stroke();c.restore();}
 for(let row=0;row<8;row++)for(const side of [-1,1]){
  const y=465-row*54,x=126+Math.sin(row*1.3)*8,reach=70-Math.abs(row-3)*5;
  c.lineWidth=1.8;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+side*reach*.45,y-18,x+side*reach,y-33);c.stroke();
  for(let i=0;i<3;i++)leaf(x+side*(18+i*reach/3),y-8-i*11,70+(row+i)%3*5,44,side*(.75+i*.1),183+(row*7+i*19)%60);
 }
 leaf(130,52,49,29,.08,225);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.name='3B original leafy twig';return texture;
}
