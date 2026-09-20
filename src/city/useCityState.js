import {useCallback,useEffect,useRef,useState} from 'react';
import {city3bRequest} from './city3b-client.js';
import {createCityRequestGate} from './request-gate.js';

/** State is account-scoped, including while a new request is still loading. */
export function useCityState(uid,{enabled=true,initialAction='snapshot'}={}){
 const gate=useRef(null),pending=useRef(null);
 if(!gate.current)gate.current=createCityRequestGate();
 gate.current.scope(uid,enabled);
 const [state,setState]=useState({uid:null,data:null,error:'',busy:false,loaded:false});
 const current=state.uid===uid?state:{uid,data:null,error:'',busy:false,loaded:false};
 const call=useCallback(async(action,body={})=>{
  if(!uid||!enabled)return null;
  if(pending.current?.uid===uid&&gate.current.accepts(pending.current.ticket))return null;
  const ticket=gate.current.begin();if(!ticket)return null;
  pending.current={uid,ticket};
  setState(previous=>({uid,data:previous.uid===uid?previous.data:null,error:'',busy:true,loaded:previous.uid===uid&&previous.loaded}));
  try{
   const data=await city3bRequest(action,body,uid);
   if(!gate.current.accepts(ticket))return null;
   setState({uid,data,error:'',busy:false,loaded:true});return data;
  }catch(error){
   if(gate.current.accepts(ticket))setState(previous=>({...previous,uid,error:error.message||'Ville 3B momentanément indisponible.',busy:false,loaded:true}));
   return null;
  }finally{if(pending.current?.ticket===ticket)pending.current=null;}
 },[uid,enabled]);
 useEffect(()=>{
  if(uid&&enabled)void call(initialAction);
  return()=>{gate.current.invalidate();pending.current=null;};
 },[uid,enabled,initialAction,call]);
 return {data:enabled?current.data:null,error:enabled?current.error:'',busy:enabled&&current.busy,loading:!!uid&&enabled&&!current.loaded,call};
}
