export function worldTimeSnapshot(date=new Date()){
 const hour=date.getHours()+date.getMinutes()/60;
 const phase=hour<5?'night':hour<8?'dawn':hour<18?'day':hour<21?'sunset':'night';
 const daylight=phase==='night'?.18:phase==='dawn'?.55:phase==='sunset'?.62:1;
 const sun=phase==='night'?.15:phase==='dawn'?.75:phase==='sunset'?.85:1;
 const fog=phase==='night'?.72:phase==='dawn'?.8:phase==='sunset'?.88:1;
 const wind=.35+.35*Math.sin((hour/24)*Math.PI*2);
 return {hour,phase,daylight,sun,fog,wind,night:phase==='night'};
}
