import {validPoseMatrix} from './xr-session.js';
export const PASSAGE_HEIGHT=.36, MANUAL_DISTANCE=.55;
const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
export function multiplyRigid(a,b){const out=new Array(16).fill(0);for(let column=0;column<4;column++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[column*4+row]+=a[k*4+row]*b[column*4+k];return out;}
export function relativeRigid(origin,world){
 const inverse=[origin[0],origin[4],origin[8],0,origin[1],origin[5],origin[9],0,origin[2],origin[6],origin[10],0,0,0,0,1];
 for(let row=0;row<3;row++)inverse[12+row]=-(inverse[row]*origin[12]+inverse[4+row]*origin[13]+inverse[8+row]*origin[14]);
 return multiplyRigid(inverse,world);
}
function upright(position,z){const length=Math.hypot(z[0],z[2]);if(length<.1)return null;const x=z[0]/length,zz=z[2]/length;return [zz,0,-x,0,0,1,0,0,x,0,zz,0,...position,1];}
export function placementFromHit(input,viewerInput){
 const pose=validPoseMatrix(input),viewer=validPoseMatrix(viewerInput);if(!pose||!viewer)return null;
 const position=pose.slice(12,15),towards=position.map((value,index)=>viewer[12+index]-value),distance=Math.hypot(...towards);
 if(distance<.25||distance>.95)return null;
 const normal=pose.slice(4,7);let kind,matrix;
 if(Math.abs(normal[1])<=Math.sin(Math.PI/9)){
  kind='wall';if(dot(normal,towards)<0)for(let i=0;i<3;i++)normal[i]=-normal[i];
  matrix=upright(position.map((value,index)=>value+normal[index]*.012),normal);
 }else if(normal[1]>=Math.cos(Math.PI/9)){
  kind='floor';position[1]+=PASSAGE_HEIGHT/2+.008;matrix=upright(position,towards);
 }else return null;
 return matrix?{kind,matrix,offset:relativeRigid(pose,matrix)}:null;
}
export function manualPlacement(viewerInput){
 const viewer=validPoseMatrix(viewerInput);if(!viewer)return null;
 const position=viewer.slice(12,15).map((value,index)=>value-viewer[8+index]*MANUAL_DISTANCE);
 const matrix=upright(position,[viewer[8],0,viewer[10]]);if(!matrix)return null;
 const yaw=Math.atan2(matrix[8],matrix[10]);
 return {kind:'manual',matrix,position:{x:position[0],y:position[1],z:position[2]},orientation:{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}};
}
