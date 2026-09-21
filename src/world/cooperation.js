import {authClient} from '../loyalty/client.js';
import {countryById} from './catalog.js';
import {worldRadiusFor} from './terrain.js';
import {PARTY_SIGNAL_SET,PARTY_SIGNALS} from './coop-session.js';

export async function partyRequest(action,payload={},client=authClient){
 const {data,error}=await client.rpc('world_party_command',{p_action:action,p_payload:payload});
 if(error)throw Error(error.message||'Le groupe est momentanément indisponible.');return data;
}

export async function partyRuntimeRequest(action,payload={},client=authClient){
 const {data,error}=await client.rpc('world_party_runtime_command',{p_action:action,p_payload:payload});
 if(error)throw Error(error.message||'La synchronisation coop est momentanément indisponible.');return data;
}

export function validPose(p){
 if(!p||!Number.isSafeInteger(p.seq)||p.seq<0||!(p.region==='hub'||!!countryById[p.region])||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.heading))return false;
 return Math.hypot(p.x,p.z)<=worldRadiusFor(p.region)+1;
}

export function validRuntimeMember(p){
 if(!p||typeof p.id!=='string'||!(p.region==='hub'||!!countryById[p.region])||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.z))||!Number.isFinite(Number(p.heading)))return false;
 return ['active','downed'].includes(p.state)&&Math.hypot(Number(p.x),Number(p.z))<=worldRadiusFor(p.region)+2;
}

export function mergeRuntimePeers(peers=[],runtimeMembers=[],partyMembers=[],now=0){
 const partyById=new Map((partyMembers||[]).map(member=>[member.id,member])),runtimeById=new Map((runtimeMembers||[]).filter(validRuntimeMember).map(member=>[member.id,member]));
 const merged=new Map((peers||[]).map(peer=>[peer.id,{...peer}]));
 for(const [id,row] of runtimeById){
  const info=partyById.get(id);if(!info)continue;
  const existing=merged.get(id);
  merged.set(id,{
   ...(existing||{id,seq:-1,received:now,signal:null}),
   id,
   avatar:info.avatar,
   region:row.region,
   x:Number(row.x),
   z:Number(row.z),
   heading:Number(row.heading)||0,
   lifeState:row.state,
   runtimeRevision:Number(row.revision)||0,
   runtimeUpdatedAt:row.updated_at||null,
   received:now,
  });
 }
 return [...merged.values()];
}

function freshRequestId(){
 const value=globalThis.crypto?.randomUUID?.();
 if(!value)throw Error('Ton navigateur ne peut pas sécuriser cette requête coop.');
 return value;
}

export function createPartyConnection({uid,onState,onPeers,onConnection,onError,onRuntimeState=()=>{},client=authClient}){
 let disposed=false,current=null,channels=new Map(),peers=new Map(),runtimeMembers=[],lastPoll=0,sequence=0,pose=null,lastSend=0,polling=false,lastRuntime=0,runtimeBusy=false,lastRuntimeError=0;
 function partyMembers(){return current?.members||[];}
 function emit(){
  const now=performance.now(),merged=mergeRuntimePeers([...peers.values()].filter(p=>now-(p.received||0)<4500),runtimeMembers,partyMembers(),now).filter(p=>p.id!==uid);
  onPeers(merged);
 }
 function remove(){for(const c of channels.values())client.removeChannel(c);channels.clear();peers.clear();runtimeMembers=[];emit();}
 function applyRuntime(data){
  if(disposed||data?.party_id&&data.party_id!==current?.party?.id)return;
  if(Array.isArray(data?.members)){
   const all=data.members.filter(validRuntimeMember),self=all.find(row=>row.id===uid)||null;
   runtimeMembers=all.filter(row=>row.id!==uid);onRuntimeState(self);
  }
  const now=performance.now(),merged=mergeRuntimePeers([...peers.values()],runtimeMembers,partyMembers(),now);
  peers=new Map(merged.filter(peer=>peer.id!==uid).map(peer=>[peer.id,peer]));emit();
 }
 async function runtime(action,payload={}){
  const data=await partyRuntimeRequest(action,payload,client);
  if(Array.isArray(data?.members))applyRuntime(data);
  return data;
 }
 async function refreshRuntime(){
  if(runtimeBusy||disposed||!current?.party)return null;
  runtimeBusy=true;
  try{return await runtime('status');}
  catch(error){const now=performance.now();if(now-lastRuntimeError>15000){lastRuntimeError=now;onError(error.message);}return null;}
  finally{runtimeBusy=false;}
 }
 async function heartbeat(){
  if(runtimeBusy||disposed||!current?.party||!pose)return null;
  runtimeBusy=true;lastRuntime=performance.now();
  try{return await runtime('heartbeat',{region:pose.region,x:pose.x,z:pose.z,heading:pose.heading||0});}
  catch(error){const now=performance.now();if(now-lastRuntimeError>15000){lastRuntimeError=now;onError(error.message);}return null;}
  finally{runtimeBusy=false;}
 }
 async function update(data){
  if(disposed)return;const previous=current;current=data;onState(data);
  if(previous?.party?.id!==data?.party?.id)remove();
  const members=data?.members||[],ids=new Set(members.map(m=>m.id));
  for(const [id,c] of channels)if(!ids.has(id)){client.removeChannel(c);channels.delete(id);peers.delete(id);}
  if(!data?.party){onConnection('solo');return;}
  const {data:{session}}=await client.auth.getSession();if(disposed||session?.user.id!==uid)return;
  await client.realtime.setAuth(session.access_token);
  for(const member of members){
   if(channels.has(member.id))continue;
   const partyId=data.party.id,channel=client.channel(`worldparty:${partyId}:${member.id}`,{config:{private:true,broadcast:{self:false}}});channels.set(member.id,channel);
   channel.on('broadcast',{event:'pose'},({payload})=>{
    if(disposed||current?.party?.id!==partyId||!validPose(payload)||member.id===uid)return;
    const old=peers.get(member.id);if(old&&payload.seq<=old.seq&&performance.now()-old.received<4500)return;
    const info=current.members.find(m=>m.id===member.id);if(!info)return;
    const runtimeRow=runtimeMembers.find(row=>row.id===member.id);
    peers.set(member.id,{...payload,id:member.id,avatar:info.avatar,received:performance.now(),signal:PARTY_SIGNAL_SET.has(payload.signal)?payload.signal:null,lifeState:runtimeRow?.state||old?.lifeState||'active'});
    emit();
   }).subscribe(status=>{if(disposed)return;if(member.id===uid)onConnection(status==='SUBSCRIBED'?'connected':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'reconnecting':'connecting');});
  }
  await refreshRuntime();emit();
 }
 async function refresh(){if(polling||disposed)return;polling=true;try{await update(await partyRequest('status',{},client));}catch(error){onConnection('reconnecting');if(performance.now()-lastPoll>15000)onError(error.message);}finally{lastPoll=performance.now();polling=false;}}
 const timer=setInterval(()=>{
  if(document.hidden||disposed)return;
  const now=performance.now();
  if(now-lastPoll>(current?.party?3500:25000))refresh();
  const channel=channels.get(uid);
  if(pose&&channel?.state==='joined'&&now-lastSend>=100){lastSend=now;channel.send({type:'broadcast',event:'pose',payload:{...pose,seq:sequence++}});}
  if(current?.party&&pose&&now-lastRuntime>=900)heartbeat();
  emit();
 },100);
 refresh();
 return{
  update,refresh,refreshRuntime,
  pose(value){pose=value;},
  signal(value){if(!PARTY_SIGNAL_SET.has(value)||!pose)return false;pose={...pose,signal:value};const duration=PARTY_SIGNALS[value]?.duration||1800;setTimeout(()=>{if(pose?.signal===value)pose={...pose,signal:null};},duration);return true;},
  async down(){const data=await runtime('down');await refreshRuntime();return data;},
  async revive(target,request=freshRequestId()){const data=await runtime('revive',{target,request});await refreshRuntime();return data;},
  async objective({objective,region,x,z,required=2,request=freshRequestId()}){return runtime('objective',{objective,region,x,z,required,request});},
  dispose(){disposed=true;clearInterval(timer);remove();}
 };
}
