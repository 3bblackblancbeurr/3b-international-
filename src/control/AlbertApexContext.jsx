import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {
 ALBERT_OPERATION_MODES,ALBERT_RESOURCE_PROFILES,
 compileAlbertSpec,compileAlbertTaskGraph,createAlbertEvent,
 createApexState,normalizeApexState,inspectAlbertStrategy,
 evaluateCompletion,createEvidenceBundle
} from './albert-apex-core.js';

const Context=createContext(null);
const STORAGE='3b-albert-apex-os-v2';
function load(){
 try{return normalizeApexState(JSON.parse(localStorage.getItem(STORAGE)||'null'));}
 catch{return createApexState();}
}
function persistable(state){
 return{
  ...state,
  tasks:state.tasks.slice(-60),
  events:state.events.slice(-100),
  needYou:state.needYou.slice(-30),
  history:state.history.slice(-80)
 };
}

export function AlbertApexProvider({children}){
 const[state,setState]=useState(load);
 const active=useRef(new Map());
 useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(persistable(state)));}catch{}},[state]);

 const setMode=useCallback(mode=>{
  if(!ALBERT_OPERATION_MODES.includes(mode))return;
  setState(s=>({...s,mode,session:{...s.session,mode},events:[...s.events,createAlbertEvent('mode.changed',{mode})].slice(-100)}));
 },[]);
 const setResourceProfile=useCallback(resourceProfile=>{
  if(!ALBERT_RESOURCE_PROFILES.includes(resourceProfile))return;
  setState(s=>({...s,resourceProfile,session:{...s.session,resourceProfile},events:[...s.events,createAlbertEvent('resource.changed',{resourceProfile})].slice(-100)}));
 },[]);

 const emit=useCallback((type,payload={},priority)=>{
  const event=createAlbertEvent(type,payload,priority);
  setState(s=>({...s,events:[...s.events,event].slice(-100)}));
  return event;
 },[]);

 const needUser=useCallback((title,detail='',level='attention')=>{
  const item={id:'need-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),title:String(title||'Validation requise').slice(0,180),detail:String(detail||'').slice(0,1000),level,createdAt:new Date().toISOString()};
  setState(s=>({...s,needYou:[...s.needYou,item].slice(-30),events:[...s.events,createAlbertEvent('approval.required',{title:item.title},'attention')].slice(-100)}));
  return item.id;
 },[]);

 const resolveNeed=useCallback(id=>setState(s=>({...s,needYou:s.needYou.filter(item=>item.id!==id)})),[]);

 const beginTask=useCallback((intent,{project='ALBERT APEX',constraints=[],acceptance=[]}={})=>{
  let spec;
  try{spec=compileAlbertSpec({prompt:intent,constraints,acceptance:acceptance.length?acceptance:undefined},{project,constitution:state.constitution});}
  catch{return null;}
  const graph=compileAlbertTaskGraph(spec);
  const strategy=inspectAlbertStrategy(state.history,intent);
  const record={
   id:'run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
   intent:String(intent).slice(0,12000),
   status:'running',
   startedAt:new Date().toISOString(),
   endedAt:null,
   spec,
   graph,
   strategy,
   evidence:null,
   completion:{complete:false,state:'NOT_VERIFIED',checks:{}},
   error:''
  };
  active.current.set(record.id,true);
  setState(s=>({
   ...s,
   tasks:[...s.tasks,record].slice(-60),
   history:[...s.history,{intent:record.intent,status:'running',at:record.startedAt}].slice(-80),
   session:{...s.session,taskIds:[...new Set([...(s.session.taskIds||[]),record.id])]},
   events:[...s.events,createAlbertEvent('task.started',{id:record.id,kind:spec.kind,strategy:strategy.state})].slice(-100)
  }));
  return record.id;
 },[state.constitution,state.history]);

 const patchTask=useCallback((taskId,patch)=>{
  setState(s=>({...s,tasks:s.tasks.map(t=>t.id===taskId?{...t,...patch}:t)}));
 },[]);

 const progressTask=useCallback((taskId,label,phase='EXECUTE')=>{
  setState(s=>({...s,tasks:s.tasks.map(t=>t.id===taskId?{...t,progress:{label:String(label||'En cours').slice(0,240),phase,at:new Date().toISOString()}}:t)}));
 },[]);

 const completeTask=useCallback((taskId,evidenceInput={})=>{
  active.current.delete(taskId);
  setState(s=>{
   const tasks=s.tasks.map(t=>{
    if(t.id!==taskId)return t;
    const graph={...t.graph,tasks:t.graph.tasks.map(node=>({...node,status:'verified',startedAt:node.startedAt||t.startedAt,endedAt:new Date().toISOString(),attempts:Math.max(1,node.attempts||0)}))};
    const evidence=createEvidenceBundle(evidenceInput);
    const completion=evaluateCompletion({spec:t.spec,graph,evidence:{executed:true,tested:evidenceInput.tested===true,verified:evidenceInput.verified===true,reversible:evidenceInput.reversible!==false,documented:evidenceInput.documented===true}});
    return{...t,status:completion.complete?'verified':'review',endedAt:new Date().toISOString(),graph,evidence,completion,progress:{label:completion.complete?'Vérifié':'Preuves incomplètes',phase:'EVIDENCE',at:new Date().toISOString()}};
   });
   const current=tasks.find(t=>t.id===taskId);
   return{
    ...s,tasks,
    history:[...s.history,{intent:current?.intent||taskId,status:current?.status||'review',at:new Date().toISOString()}].slice(-80),
    events:[...s.events,createAlbertEvent(current?.status==='verified'?'task.verified':'task.review',{id:taskId})].slice(-100)
   };
  });
 },[]);

 const failTask=useCallback((taskId,error)=>{
  active.current.delete(taskId);
  const message=String(error?.message||error||'Échec').slice(0,1500);
  setState(s=>({...s,
   tasks:s.tasks.map(t=>t.id===taskId?{...t,status:'failed',endedAt:new Date().toISOString(),error:message,progress:{label:'Échec',phase:'FAILED',at:new Date().toISOString()}}:t),
   history:[...s.history,{intent:s.tasks.find(t=>t.id===taskId)?.intent||taskId,status:'failed',at:new Date().toISOString()}].slice(-80),
   events:[...s.events,createAlbertEvent('task.failed',{id:taskId,error:message},'critical')].slice(-100)
  }));
 },[]);

 const cancelTask=useCallback((taskId,reason='Interrompu par l’utilisateur')=>{
  active.current.delete(taskId);
  setState(s=>({...s,tasks:s.tasks.map(t=>t.id===taskId&&['running','review'].includes(t.status)?{...t,status:'cancelled',endedAt:new Date().toISOString(),error:String(reason).slice(0,500),progress:{label:'Annulé',phase:'CANCELLED',at:new Date().toISOString()}}:t),events:[...s.events,createAlbertEvent('task.cancelled',{id:taskId})].slice(-100)}));
 },[]);

 const killAll=useCallback(()=>{
  active.current.clear();
  setState(s=>({...s,killSwitch:true,tasks:s.tasks.map(t=>['running','review'].includes(t.status)?{...t,status:'cancelled',endedAt:new Date().toISOString(),error:'STOP ALBERT'}:t),events:[...s.events,createAlbertEvent('kill-switch.activated',{},'critical')].slice(-100)}));
 },[]);
 const resume=useCallback(()=>setState(s=>({...s,killSwitch:false,events:[...s.events,createAlbertEvent('kill-switch.released',{},'attention')].slice(-100)})),[]);
 const resetSession=useCallback(()=>setState(s=>({...s,session:{...s.session,id:'session-'+Date.now().toString(36),startedAt:new Date().toISOString(),endedAt:null,taskIds:[]},needYou:[],events:[...s.events,createAlbertEvent('session.started')].slice(-100)})),[]);

 const value=useMemo(()=>({state,setMode,setResourceProfile,emit,needUser,resolveNeed,beginTask,patchTask,progressTask,completeTask,failTask,cancelTask,killAll,resume,resetSession}),[state,setMode,setResourceProfile,emit,needUser,resolveNeed,beginTask,patchTask,progressTask,completeTask,failTask,cancelTask,killAll,resume,resetSession]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAlbertApex(){
 const value=useContext(Context);
 if(!value)throw new Error('useAlbertApex doit être utilisé dans AlbertApexProvider.');
 return value;
}
