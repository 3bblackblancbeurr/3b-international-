import {authClient} from '../loyalty/client.js';
import {countryById} from './catalog.js';
export async function partyRequest(action,payload={},client=authClient){
 const {data,error}=await client.rpc('world_party_command',{p_action:action,p_payload:payload});
 if(error)throw Error(error.message||'Le groupe est momentanément indisponible.');return data;
}
export function validPose(p){return p&&Number.isSafeInteger(p.seq)&&p.seq>=0&&(p.region==='hub'||!!countryById[p.region])&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.hypot(p.x,p.z)<=261&&Number.isFinite(p.heading);}
export function createPartyConnection({uid,onState,onPeers,onConnection,onError,client=authClient}){
 let disposed=false,current=null,channels=new Map(),peers=new Map(),lastPoll=0,sequence=0,pose=null,lastSend=0,polling=false;
 function emit(){onPeers([...peers.values()].filter(p=>performance.now()-p.received<4500));}
 function remove(){for(const c of channels.values())client.removeChannel(c);channels.clear();peers.clear();emit();}
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
    peers.set(member.id,{...payload,id:member.id,avatar:info.avatar,received:performance.now(),signal:['hello','follow','help'].includes(payload.signal)?payload.signal:null});emit();
   }).subscribe(status=>{if(disposed)return;if(member.id===uid)onConnection(status==='SUBSCRIBED'?'connected':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'reconnecting':'connecting');});
  }
  emit();
 }
 async function refresh(){if(polling||disposed)return;polling=true;try{await update(await partyRequest('status',{},client));}catch(error){onConnection('reconnecting');if(performance.now()-lastPoll>15000)onError(error.message);}finally{lastPoll=performance.now();polling=false;}}
 const timer=setInterval(()=>{
  if(document.hidden||disposed)return;
  if(performance.now()-lastPoll>(current?.party?3500:25000))refresh();
  const channel=channels.get(uid),now=performance.now();
  if(pose&&channel?.state==='joined'&&now-lastSend>=100){lastSend=now;channel.send({type:'broadcast',event:'pose',payload:{...pose,seq:sequence++}});}
  emit();
 },100);
 refresh();
 return{update,refresh,pose(value){pose=value;},signal(value){if(pose){pose={...pose,signal:value};setTimeout(()=>{if(pose?.signal===value)pose={...pose,signal:null};},1600);}},dispose(){disposed=true;clearInterval(timer);remove();}};
}
