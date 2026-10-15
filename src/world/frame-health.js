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

// The interval ending at frame N belongs to the work submitted in frame N-1.
// Keep that work until the next start; measuring frame N would blame the
// recovery frame for a hitch. All timings are CPU submission, never GPU time.
export function createFrameTimeline(health){
 let previous=null;
 return{
  begin(now){
   if(previous&&Number.isFinite(now)&&now>previous.started){
    const gapMs=now-previous.started;
    health.sample({gapMs,updateMs:previous.updateMs,renderMs:previous.renderMs,moving:previous.moving,
     context:gapMs>=250?{...previous.context,worldMs:previous.worldMs,snapshotMs:previous.snapshotMs,
      frameCpuMs:previous.totalMs,betweenFramesMs:Math.round(Math.max(0,gapMs-previous.totalMs))}:null});
   }
   previous=null;
  },
  end({started,finished,updateMs=0,worldMs=0,renderMs=0,snapshotMs=0,moving=false,context=null}){
   if(!Number.isFinite(started)||!Number.isFinite(finished)||finished<started){previous=null;return;}
   previous={started,totalMs:Math.round(finished-started),updateMs,worldMs:Math.round(worldMs),renderMs,
    snapshotMs:Math.round(snapshotMs),moving,context:context?{...context}:null};
  },
  reset(){previous=null;},
 };
}
