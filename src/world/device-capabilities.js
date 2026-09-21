export function worldVisualCapabilities({mode='auto',width=0,height=0,deviceMemory=4,coarsePointer=false}={}){
 const memory=Number.isFinite(Number(deviceMemory))?Number(deviceMemory):4;
 const viewport=Math.max(0,Number(width)||0,Number(height)||0);
 const desktopClass=!coarsePointer&&viewport>=900&&memory>=8;
 const allowPlanarReflection=mode==='detail'&&desktopClass;
 const highEndAuto=mode==='auto'&&desktopClass;
 const shadowMapSize=(mode==='detail'&&desktopClass)||highEndAuto?2048:1024;
 return {desktopClass,allowPlanarReflection,highEndAuto,shadowMapSize};
}
