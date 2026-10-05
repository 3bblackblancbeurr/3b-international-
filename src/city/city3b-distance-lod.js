// Distance relative to the current map extent, with separate enter/leave
// thresholds so a pinch or scroll near a boundary cannot alternate quality.
export function cityDistanceTier(ratio,current=0,mobile=false){
 const tier=Math.max(0,Math.min(2,Math.trunc(Number(current))||0)),value=Number(ratio);
 if(ratio==null||!Number.isFinite(value)||value<0)return tier;
 const enterMedium=mobile?.62:.82,leaveMedium=mobile?.48:.66;
 const enterFar=mobile?1.20:1.55,leaveFar=mobile?.98:1.30;
 if(tier===0)return value>=enterFar?2:value>=enterMedium?1:0;
 if(tier===1)return value>=enterFar?2:value<leaveMedium?0:1;
 return value<leaveMedium?0:value<leaveFar?1:2;
}
