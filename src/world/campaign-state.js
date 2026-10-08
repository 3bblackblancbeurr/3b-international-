import {CAMPAIGN_RUNTIME_SPEC,campaignTokenIds,campaignEffectIds,campaignPhaseIds} from './campaign-spec.js';
const int=(v,max=1e6)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export const blankCampaignState=()=>({version:1,active:false,phase:0,step:0,completed:[],claimed:[],inventory:{},effects:[],history:[],tick:0,clock:0,started:false,trial:0,integrity:100,intensity:0,lastOperation:null,escort:null,protectionUntil:0,actionTick:0,attempt:0,message:''});
export function normalizeCampaignState(region,input){
 const state=blankCampaignState(),spec=CAMPAIGN_RUNTIME_SPEC[region];if(!spec||!input||input.version!==1)return state;
 state.active=input.active===true;
 const completed=Array.isArray(input.completed)?input.completed:[];for(const phase of spec){if(completed.includes(phase.id))state.completed.push(phase.id);else break;}
 state.phase=state.completed.length;state.step=Math.min(int(input.step,8),Math.max(0,(spec[state.phase]?.steps.length||1)-1));
 const ids=campaignPhaseIds(region);state.claimed=[...new Set(Array.isArray(input.claimed)?input.claimed:[])].filter(id=>state.completed.includes(id)&&ids.includes(id));
 for(const id of campaignTokenIds(region)){const amount=int(input.inventory?.[id],9);if(amount)state.inventory[id]=amount;}
 state.effects=[...new Set(Array.isArray(input.effects)?input.effects:[])].filter(id=>campaignEffectIds(region).includes(id));
 state.history=(Array.isArray(input.history)?input.history:[]).filter(row=>row&&typeof row.id==='string'&&typeof row.choice==='string'&&spec.some(p=>p.steps.some(s=>region+':'+p.id+':'+s.id===row.id))).slice(-48).map(row=>({id:row.id,choice:row.choice.slice(0,48)}));
 for(const key of ['tick','clock','protectionUntil','actionTick'])state[key]=int(input[key],1e9);state.started=!!input.started;
 state.trial=int(input.trial,32);state.integrity=input.integrity===undefined?100:int(input.integrity,100);state.intensity=int(input.intensity,100);state.attempt=int(input.attempt,999);
 state.lastOperation=['strike','guard','repair'].includes(input.lastOperation)?input.lastOperation:null;
 if(Number.isFinite(input.escort?.x)&&Number.isFinite(input.escort?.z)&&Math.hypot(input.escort.x,input.escort.z)<10000)state.escort={x:input.escort.x,z:input.escort.z};
 state.message=typeof input.message==='string'?input.message.slice(0,240):'';
 return state;
}
export function normalizeCampaigns(input){return Object.fromEntries(Object.keys(CAMPAIGN_RUNTIME_SPEC).filter(region=>input?.[region]).map(region=>[region,normalizeCampaignState(region,input[region])]));}
