// Local, bounded diagnostics. Never uploads data or records player identity.
// Call only for active, loaded gameplay; tab suspension/loading is excluded.
export function createFrameHealth(){
 const intervals=new Float32Array(240);
 const events=[];
 let cursor=0,count=0,frames=0,movingFrames=0,stalls=0,maxGapMs=0,updatePeakMs=0,renderPeakMs=0;
 return{
  sample({gapMs,updateMs=0,renderMs=0,moving=false,context=null}){
   if(!Number.isFinite(gapMs)||gapMs<=0)return;
   intervals[cursor]=gapMs;cursor=(cursor+1)%intervals.length;count=Math.min(count+1,intervals.length);frames++;
   if(!moving)return;
   movingFrames++;maxGapMs=Math.max(maxGapMs,gapMs);if(gapMs>=250){
    stalls++;events.push({...context,gapMs:Math.round(gapMs),updateMs:Math.round(updateMs),renderMs:Math.round(renderMs)});
    if(events.length>20)events.shift();
   }
   if(Number.isFinite(updateMs))updatePeakMs=Math.max(updatePeakMs,updateMs);
   if(Number.isFinite(renderMs))renderPeakMs=Math.max(renderPeakMs,renderMs);
  },
  snapshot(){
   const ordered=Array.from(intervals.subarray(0,count)).sort((a,b)=>a-b);
   return{frames,movingFrames,stalls,maxGapMs:Math.round(maxGapMs),
    p95Ms:count?Math.round(ordered[Math.ceil(count*.95)-1]):0,
    updatePeakMs:Math.round(updatePeakMs),renderPeakMs:Math.round(renderPeakMs),windowFrames:count,events:events.map(event=>({...event}))};
  },
 };
}
