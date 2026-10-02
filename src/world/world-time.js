export function worldTimeSnapshot(date=new Date()){
 const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
 const phase=hour<5?'night':hour<8?'dawn':hour<18?'day':hour<21?'sunset':'night';
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const solar=smooth((hour-5)/3)*(1-smooth((hour-18)/3));
 const daylight=.18+.82*solar,sun=.15+.85*solar,fog=.72+.28*solar;
 const wind=.35+.35*Math.sin((hour/24)*Math.PI*2);
 return {hour,phase,daylight,sun,fog,wind,night:phase==='night'};
}
