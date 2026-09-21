export function wetnessForWeather(weather){
 if(weather==='storm')return 1;
 if(weather==='heavy_rain')return .82;
 if(weather==='rain')return .55;
 if(weather==='fog')return .22;
 if(weather==='snow')return .10;
 return .06;
}

export function advanceWetness(current,target,dt){
 const safeCurrent=Math.max(0,Math.min(1,Number(current)||0));
 const safeTarget=Math.max(0,Math.min(1,Number(target)||0));
 const delta=Math.max(0,Math.min(.25,Number(dt)||0));
 const speed=safeTarget>safeCurrent?.42:.075;
 return safeCurrent+(safeTarget-safeCurrent)*(1-Math.exp(-delta*speed));
}
