import {BufferGeometry,Float32BufferAttribute,CanvasTexture,RepeatWrapping,SRGBColorSpace} from 'three';

// Curved, folded leaves replace the flat four-point diamonds. Still one instanced draw.
export function createTreeLeafGeometry(){
 const positions=[],uv=[],indices=[],rows=8;
 for(let row=0;row<=rows;row++){
  const t=row/rows,spread=Math.sin(Math.PI*t)*(.42+.1*t);
  for(let column=-1;column<=1;column++){
   positions.push(column*spread,1-t*2,Math.sin(Math.PI*t)*(.22-.14*Math.abs(column)));
   uv.push((column+1)/2,t);
  }
 }
 for(let row=0;row<rows;row++)for(let column=0;column<2;column++){
  const a=row*3+column,b=a+3;
  indices.push(a,b,a+1,a+1,b,b+1);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// A compact deterministic bark material; no extra downloaded artwork or animation loop.
export function createTreeBarkTexture(makeCanvas=()=>document.createElement('canvas')){
 const canvas=makeCanvas();canvas.width=256;canvas.height=256;
 const context=canvas.getContext('2d');if(!context)return null;
 const image=context.createImageData(canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const grain=Math.sin(y*.25+Math.sin(x*.035)*2.8)+Math.sin(y*.63+x*.013)*.35;
  const pores=Math.sin(x*17.17+y*73.31)*Math.sin(x*5.93+y*2.17);
  const shade=Math.max(145,Math.min(250,207+grain*19+pores*12));
  const offset=(y*canvas.width+x)*4;image.data[offset]=shade;image.data[offset+1]=shade;image.data[offset+2]=shade;image.data[offset+3]=255;
 }
 context.putImageData(image,0,0);
 const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(3,1);texture.colorSpace=SRGBColorSpace;return texture;
}
