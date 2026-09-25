const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const wrapAngle=a=>{let x=a;while(x>Math.PI)x-=Math.PI*2;while(x<-Math.PI)x+=Math.PI*2;return x;};

export function shapeJoystick(rawDx=0,rawDy=0,{deadZone=9,radius=88}={}){
  const rawLength=Math.hypot(rawDx,rawDy);
  if(rawLength<=deadZone)return{x:0,y:0,intensity:0,active:false,visual:0,angle:0};
  const active=Math.max(0,rawLength-deadZone);
  const normalized=clamp(active/Math.max(1,radius-deadZone),0,1);
  const curved=normalized<.72
    ? Math.pow(normalized,1.28)*.82
    : .82+(normalized-.72)/.28*.18;
  const inv=rawLength?1/rawLength:0;
  return{
    x:rawDx*inv,
    y:rawDy*inv,
    intensity:clamp(curved,0,1),
    active:true,
    visual:clamp(active,0,39),
    angle:Math.atan2(rawDy,rawDx),
  };
}
export function createTechniqueTracker(){
  return{lastAt:0,lastX:0,lastY:0,lastAngle:0,turn:0,sideAt:0,side:0,lastTechniqueAt:0};
}

export function detectJoystickTechnique(tracker,input,now=performance.now()){
  if(!tracker||!input?.active){
    if(tracker){tracker.turn=0;tracker.side=0;tracker.sideAt=0;}
    return null;
  }
  const dt=now-(tracker.lastAt||now);
  const cooldown=now-(tracker.lastTechniqueAt||0);
  let action=null;
  if(tracker.lastAt&&dt<230&&cooldown>420&&input.intensity>.62){
    const reversed=Math.abs(tracker.lastX)>.62&&Math.abs(input.x)>.62&&Math.sign(tracker.lastX)!==Math.sign(input.x);
    if(reversed)action={type:'cut',direction:Math.sign(input.x),intensity:clamp(.72+input.intensity*.28,0,1),label:'CROCHET'};
  }
  if(tracker.lastAt&&dt<130&&input.intensity>.56){
    tracker.turn+=wrapAngle(input.angle-tracker.lastAngle);
  }else if(dt>=130){
    tracker.turn*=.35;
  }
  if(!action&&cooldown>620&&Math.abs(tracker.turn)>Math.PI*.46&&input.intensity>.58){
    action={type:'rhythm',direction:Math.sign(tracker.turn)||1,intensity:clamp(.68+input.intensity*.24,0,1),label:'ROULETTE'};
    tracker.turn=0;
    tracker.sideAt=0;tracker.side=0;
  }
  if(!action&&Math.abs(input.x)>.62&&input.intensity>.52){
    tracker.side=Math.sign(input.x);tracker.sideAt=now;
  }
  if(!action&&tracker.sideAt&&now-tracker.sideAt<320&&cooldown>420&&Math.abs(input.x)<.45&&input.y<-.68&&input.intensity>.6){
    action={type:'feint',direction:tracker.side,intensity:clamp(.7+input.intensity*.25,0,1),label:'FEINTE'};
    tracker.sideAt=0;tracker.side=0;
  }
  tracker.lastAt=now;tracker.lastX=input.x;tracker.lastY=input.y;tracker.lastAngle=input.angle;
  if(action)tracker.lastTechniqueAt=now;
  return action;
}
