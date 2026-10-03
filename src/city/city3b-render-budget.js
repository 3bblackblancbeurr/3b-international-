// Sample raw animation callbacks before the intentional 30/45 fps render cap.
export function createCityRenderBudget({mobile=false,pixelRatio=1}={}){
 let tier=0,last=null,total=0,count=0,slowWindows=0;
 const state=()=>({tier,pixelRatio:Math.min(pixelRatio,[mobile?1.35:1.75,1,.85][tier]),shadows:tier<2});
 return {state,sample(time,active=true){
  if(!active){last=null;total=0;count=0;slowWindows=0;return null;}
  const gap=last===null?0:time-last;last=time;
  if(gap<=0||gap>=100){total=0;count=0;return null;}
  total+=gap;count++;
  if(count<120)return null;
  slowWindows=total/count>35?slowWindows+1:0;total=0;count=0;
  if(slowWindows<2||tier>=2)return null;
  tier++;slowWindows=0;return state();
 }};
}
