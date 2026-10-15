import {createRoutePlanner} from '../route-planner.js';

// Ambient journeys must not run a burst of A* searches on the render thread.
// A dedicated, serial worker keeps player navigation independent and bounds
// worker count. Waiting residents stand still until their collision-safe route
// is ready; obsolete schedules and destroyed scenes can never install a path.
export function createNpcRouteScheduler({planner=createRoutePlanner(),onUpdate=()=>{},onError=()=>{},timeoutMs=10000}={}){
 const queued=new Map(),latest=new Map();let active=null,disposed=false;
 const timeout=Number.isFinite(timeoutMs)&&timeoutMs>0?timeoutMs:10000;
 const report=problem=>{try{onError(problem);}catch{}};
 const notify=()=>{try{onUpdate();}catch(problem){report(problem);}};
 const finish=job=>{
  if(latest.get(job.actor)!==job)return;
  latest.delete(job.actor);job.actor.routePending=false;notify();
 };
 const clear=()=>{
  queued.clear();for(const actor of latest.keys())actor.routePending=false;
  latest.clear();planner.cancel();notify();
 };
 async function pump(){
  if(active||disposed)return;
  const job=queued.values().next().value;if(!job)return;
  queued.delete(job.actor);active=job;let timer;
  try{
   if(!job.valid())return;
   // Sample at execution, not enqueue time: an older queued request may have
   // waited behind another resident's route.
   const request=job.request();
   timer=setTimeout(()=>{if(active===job)planner.cancel();},timeout);
   const points=await planner.plan(request);
   if(!disposed&&latest.get(job.actor)===job&&job.valid()){
    job.actor.walkTarget=points[0]||null;job.actor.walkRoute=points.slice(1);
   }
  }catch(problem){
   // Ambient route failure must not freeze the frame with a synchronous retry.
   // The resident retains the normal collision-constrained routine fallback.
   if(problem?.name!=='AbortError')report(problem);
  }finally{clearTimeout(timer);finish(job);active=null;void pump();}
 }
 return{
  schedule(actor,{request,valid=()=>true}){
   if(disposed)return false;
   const job={actor,request,valid};latest.set(actor,job);queued.set(actor,job);
   actor.walkTarget=null;actor.walkRoute=[];actor.routePending=true;
   if(active?.actor===actor)planner.cancel();
   void pump();return true;
  },
  clear,
  dispose(){if(disposed)return;disposed=true;try{clear();}finally{planner.dispose();}},
  get pending(){return latest.size;},
 };
}
