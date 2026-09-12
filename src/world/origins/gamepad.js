// Standard Gamepad mapping only; unsupported layouts keep keyboard/touch usable.
function axisPair(x=0,y=0){
 if(!Number.isFinite(x)||!Number.isFinite(y))return {x:0,y:0};
 const length=Math.hypot(x,y),strength=Math.min(1,Math.max(0,(length-.18)/.82));
 return length?{x:x/length*strength,y:y/length*strength}:{x:0,y:0};
}
export function createGamepadInput(){
 let previous=new Set(),connected=null;
 return {sample(pads=[],enabled=true){
  const pad=Array.from(pads).find(p=>p?.connected&&p.mapping==='standard');
  const neutral={move:{x:0,y:0},look:{x:0,y:0},sprint:false,actions:[]};
  if(!pad){previous.clear();connected=null;return neutral;}
  const held=new Set(pad.buttons.flatMap((b,i)=>b.pressed||b.value>.55?[i]:[]));
  const fresh=connected===pad.index;connected=pad.index;
  const actions=[];
  if(enabled&&fresh)for(const [button,action] of [[0,'interact'],[1,'dodge'],[2,'light'],[3,'heavy'],[4,'guard'],[5,'circle'],[7,'companion']])if(held.has(button)&&!previous.has(button))actions.push(action);
  previous=held;
  if(!enabled)return neutral;
  return {move:axisPair(pad.axes[0],pad.axes[1]),look:axisPair(pad.axes[2],pad.axes[3]),sprint:held.has(10),actions};
 }};
}
