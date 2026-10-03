const ACTIONS=new Set(['place','move','store','plan_roads','plan_terrain','plan_networks','plan_signals','mission_claim','construction_claim','life_action','budget_claim']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const key=(user,save)=>`3b.city.pending.v1:${user}:${save}`;
export function rememberCityCommand(storage,user,action,body,now=Date.now()){
 if(!storage||!UUID.test(user||'')||!UUID.test(body?.saveId||'')||!ACTIONS.has(action))return null;
 const command={user,action,body:JSON.parse(JSON.stringify(body)),at:now};
 const encoded=JSON.stringify(command);if(encoded.length>262144)return null;
 try{storage.setItem(key(user,body.saveId),encoded);return command;}catch{return null;}
}
export function pendingCityCommand(storage,user,save,now=Date.now()){
 try{const raw=storage?.getItem(key(user,save));if(!raw||raw.length>262144)return null;
  const command=JSON.parse(raw);
  if(command.user!==user||command.body?.saveId!==save||!ACTIONS.has(command.action)||!Number.isFinite(command.at)||command.at>now+60000||now-command.at>86400000||![1,2,3].includes(command.body.slot))return null;
  return command;
 }catch{return null;}
}
export function forgetCityCommand(storage,user,save){try{storage?.removeItem(key(user,save));}catch{}}
export function cityCommandCommitted(command,data){
 if(!command||data?.city?.city_id!==command.body.saveId)return false;
 const {action,body}=command,placements=data.placements||[],city=data.city.city||{};
 const placement=placements.find(p=>p.id===body.placement);
 if(action==='place')return placements.some(p=>p.request_id===body.request);
 if(action==='store')return placement?.placement_state==='stored';
 if(action==='move')return placement?.placement_state==='placed'&&['x','z','rotation'].every(k=>Number(placement[k])===Number(body[k]));
 if(action==='construction_claim')return !!placement?.construction_claimed_at;
 if(action==='mission_claim')return data.campaign?.missions?.some(m=>m.code===body.mission&&m.status==='claimed')||false;
 if(action.startsWith('plan_')){const field=action.slice(5)==='terrain'?'terrain':action.slice(5);const expected=field==='roads'?body.roads:body.features;return Array.isArray(expected)&&JSON.stringify(city[field]||[])===JSON.stringify(expected);}
 if(action==='life_action'&&body.command==='event_claim')return data.life?.events?.some(e=>e.code===body.value&&e.status==='claimed')||false;
 return false;
}
