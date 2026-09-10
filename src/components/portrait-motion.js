// Smooth, bounded turns with short pauses; time based so all frame rates match.
const POSES=[[0,0,0,0],[2,0,0,0],[4,.15,.026,-.018],[6,.15,.02,-.016],[8,-.105,-.045,.017],[10,-.105,-.035,.014],[12,.02,.045,0],[13.4,.02,-.018,0],[15.5,0,0,0],[18,0,0,0]];
export function portraitMotion(seconds){
 const t=((seconds%18)+18)%18;let i=1;while(POSES[i][0]<t)i++;
 const a=POSES[i-1],b=POSES[i],x=(t-a[0])/(b[0]-a[0]),ease=x*x*x*(x*(x*6-15)+10);
 return {yaw:a[1]+(b[1]-a[1])*ease+.009*Math.sin(seconds*.8),pitch:a[2]+(b[2]-a[2])*ease+.007*Math.sin(seconds*1.4),roll:a[3]+(b[3]-a[3])*ease,breath:.0035*Math.sin(seconds*1.45)};
}

