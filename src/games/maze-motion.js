const EPS=1e-7,SPEED=5.7;
export function createMazeMotion(cell){return {position:{...cell},previous:{...cell},from:{...cell},to:{...cell},angle:Math.PI,previousAngle:Math.PI,wanted:Math.PI,phase:0,previousPhase:0,moving:false,axis:'y'};}
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function stepMazeMotion(motion,grid,input,dt){
 const m=motion;m.previous={...m.position};m.previousAngle=m.angle;m.previousPhase=m.phase;m.moving=false;
 const ix=Number.isFinite(input.x)?input.x:0,iy=Number.isFinite(input.y)?input.y:0,strength=Math.min(1,Math.hypot(ix,iy));
 let budget=SPEED*Math.max(0,Math.min(dt,.2))*(strength>0?Math.max(.4,strength):0),travelled=0;
 const options=()=>{
  const x=Math.abs(ix),y=Math.abs(iy);if(x>y+.12)m.axis='x';else if(y>x+.12)m.axis='y';
  return m.axis==='x'?[[Math.sign(ix),0],[0,Math.sign(iy)]]:[[0,Math.sign(iy)],[Math.sign(ix),0]];
 };
 // A reversal is immediate; a perpendicular turn waits for the corridor centre.
 if(budget>0&&Math.hypot(m.to.x-m.position.x,m.to.y-m.position.y)>EPS){
  const dx=m.to.x-m.from.x,dy=m.to.y-m.from.y;
  if(ix*dx+iy*dy<-.12){const old=m.to;m.to=m.from;m.from=old;}
 }
 for(let guard=0;budget>EPS&&guard<5;guard++){
  let dx=m.to.x-m.position.x,dy=m.to.y-m.position.y,length=Math.hypot(dx,dy);
  if(length<EPS){
   m.position={...m.to};const dirs=options(),direction=dirs.find(([x,y])=>(x||y)&&grid[m.to.y+y]?.[m.to.x+x]===0);
   if(!direction){const [x,y]=dirs.find(([x,y])=>x||y)||[0,0];if(x||y)m.wanted=Math.atan2(x,-y);break;}
   m.from={...m.to};m.to={x:m.from.x+direction[0],y:m.from.y+direction[1]};dx=direction[0];dy=direction[1];length=1;
  }
  const amount=Math.min(budget,length);m.position.x+=dx/length*amount;m.position.y+=dy/length*amount;budget-=amount;travelled+=amount;m.wanted=Math.atan2(dx,-dy);
 }
 m.moving=travelled>EPS;m.phase+=travelled/2.5;m.angle+=angleDelta(m.angle,m.wanted)*(1-Math.exp(-dt*22));
 return {cell:{x:Math.round(m.position.x),y:Math.round(m.position.y)},travelled};
}
export function mazePose(motion,alpha=1){
 const a=Math.max(0,Math.min(1,alpha)),angle=motion.previousAngle+angleDelta(motion.previousAngle,motion.angle)*a;
 return {x:motion.previous.x+(motion.position.x-motion.previous.x)*a,y:motion.previous.y+(motion.position.y-motion.previous.y)*a,
  direction:((Math.round(angle/(Math.PI/4))%8)+8)%8,frame:motion.moving?1+Math.floor(((motion.previousPhase+(motion.phase-motion.previousPhase)*a)%1)*12):0};
}
