import {MAX_ORDERS,NATIONS,UNIT_TYPES,EXCHANGES} from './constants.js';
import {SECTORS,SECTOR_BY_ID,pathDistance} from './board.js';
import {addUnit,unitAt,unitsIn,sectorStrength,removeUnit} from './state.js';
const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=v=>structuredClone(v);
function assertNation(state,nation){if(!Number.isInteger(nation)||nation<0||nation>7||!state.nations[nation].active)throw Error('Nation invalide.');}
function assertPlanning(state,nation){if(state.phase!=='planning'||state.winner!==null)throw Error('La phase de planification est fermée.');if(state.orders.filter(o=>o.nation===nation).length>=MAX_ORDERS)throw Error('Maximum de 5 ordres par manche.');}
function committedPower(state,nation){return state.orders.filter(o=>o.nation===nation).reduce((sum,o)=>sum+(o.cost||0),0);}
function reservedReinforcements(state,nation,type){return state.orders.filter(o=>o.nation===nation&&o.type==='reinforce'&&o.unitType===type).length;}
function isOrdered(state,id){return state.orders.some(o=>o.unitIds?.includes(id));}
export function legalTargets(state,unitId){
 const u=unitAt(state,unitId),spec=UNIT_TYPES[u?.type];if(!u||!spec||['fixed','special'].includes(spec.domain))return[];
 return SECTORS.filter(s=>{
  if(spec.domain==='land'&&s.type!=='land')return false;if(spec.domain==='sea'&&s.type!=='sea')return false;
  return pathDistance(u.sectorId,s.id,spec.domain,spec.move)<=spec.move&&s.id!==u.sectorId;
 }).map(s=>s.id);
}
export function queueMove(state,nation,unitIds,targetId){
 assertPlanning(state,nation);assertNation(state,nation);const ids=[...new Set(unitIds)].slice(0,12);
 if(!ids.length)throw Error('Sélectionne au moins une unité.');const us=ids.map(id=>unitAt(state,id));
 if(us.some(u=>!u||u.nation!==nation||isOrdered(state,u.id)))throw Error('Une unité ne peut recevoir qu’un ordre par manche.');
 const from=us[0].sectorId;if(us.some(u=>u.sectorId!==from))throw Error('Les unités d’un ordre doivent partir du même secteur.');
 if(!SECTOR_BY_ID.has(targetId)||us.some(u=>!legalTargets(state,u.id).includes(targetId)))throw Error('Destination hors de portée.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'move',nation,unitIds:ids,from,target:targetId});return state;
}
export function queueExchange(state,nation,sectorId,toType){
 assertPlanning(state,nation);assertNation(state,nation);const rule=EXCHANGES.find(r=>r.to===toType);if(!rule)throw Error('Échange inconnu.');
 const candidates=unitsIn(state,sectorId,nation).filter(u=>u.type===rule.from&&!isOrdered(state,u.id)).slice(0,rule.count);
 if(candidates.length<rule.count)throw Error('Pas assez de pièces pour cet échange.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'exchange',nation,unitIds:candidates.map(u=>u.id),sectorId,fromType:rule.from,toType});return state;
}
export function queueReinforcement(state,nation,type){
 assertPlanning(state,nation);assertNation(state,nation);const spec=UNIT_TYPES[type];
 if(!spec||['flag'].includes(type))throw Error('Renfort invalide.');if(state.nations[nation].reserve[type]-reservedReinforcements(state,nation,type)<1)throw Error('Réserve épuisée.');if(state.nations[nation].power-committedPower(state,nation)<spec.cost)throw Error('Power insuffisant.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'reinforce',nation,unitIds:[],sectorId:'hq'+nation,unitType:type,cost:spec.cost});return state;
}
export function queueMegaMissile(state,nation,targetId){
 assertPlanning(state,nation);assertNation(state,nation);if(!SECTOR_BY_ID.has(targetId))throw Error('Cible invalide.');if(state.nations[nation].power-committedPower(state,nation)<100)throw Error('Il faut 100 Power disponible pour construire le Méga-missile.');
 if(state.orders.some(o=>o.nation===nation&&o.type==='mega'))throw Error('Un seul Méga-missile par manche.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'mega',nation,unitIds:[],target:targetId,cost:100});return state;
}
export function cancelOrder(state,nation,orderId){const i=state.orders.findIndex(o=>o.id===orderId&&o.nation===nation);if(i>=0)state.orders.splice(i,1);return state;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function aiOrders(state,nation){
 const random=rng(state.seed+state.round*97+nation*997),orders=[],me=state.nations[nation],limit=state.difficulty==='normal'?3:state.difficulty==='elite'?5:4;if(!me.active)return orders;
 if(me.power>=100&&random()>.35){const targets=SECTORS.filter(s=>s.hq!==null&&s.hq!==nation&&state.nations[s.hq].active).sort((a,b)=>sectorStrength(state,b.id,b.hq)-sectorStrength(state,a.id,a.hq));if(targets[0])orders.push({id:'ai-mega-'+nation,type:'mega',nation,unitIds:[],target:targets[0].id,cost:100});}
 const available=state.units.filter(u=>u.nation===nation&&!['flag'].includes(u.type));
 for(const u of available){if(orders.length>=limit)break;if(orders.some(o=>o.unitIds?.includes(u.id)))continue;const targets=legalTargets(state,u.id);if(!targets.length)continue;
  const hostile=targets.filter(id=>unitsIn(state,id).some(x=>x.nation!==nation)||(SECTOR_BY_ID.get(id).hq!==null&&SECTOR_BY_ID.get(id).hq!==nation));
  const pool=hostile.length?hostile:targets,target=pool[Math.floor(random()*pool.length)];if(target)orders.push({id:'ai-'+nation+'-'+orders.length,type:'move',nation,unitIds:[u.id],from:u.sectorId,target});
 }
 if(orders.length<limit&&me.power>=UNIT_TYPES.infantry.cost&&me.reserve.infantry>0&&random()>.45)orders.push({id:'ai-r-'+nation,type:'reinforce',nation,unitIds:[],sectorId:'hq'+nation,unitType:'infantry',cost:UNIT_TYPES.infantry.cost});
 return orders.slice(0,limit);
}
function captureFlag(state,winner,victim,sectorId,events){
 const flag=state.units.find(u=>u.type==='flag'&&u.nation===victim&&u.sectorId===sectorId);if(!flag)return;
 if(!unitsIn(state,sectorId,winner).some(u=>['infantry','regiment'].includes(u.type)))return;
 removeUnit(state,flag.id);state.nations[victim].active=false;state.nations[winner].flagsCaptured++;state.nations[winner].power=cap(state.nations[winner].power+25,0,9999);
 state.units=state.units.filter(u=>u.nation!==victim);events.push({type:'flag',sectorId,winner,victim,title:'QG CONQUIS',detail:NATIONS[winner].name+' capture le drapeau '+NATIONS[victim].name+'.'});
}
function resolveBattle(state,sectorId,origins,events){
 const contenders=[...new Set(unitsIn(state,sectorId).filter(u=>u.type!=='flag').map(u=>u.nation))].filter(n=>state.nations[n].active);if(contenders.length<2)return;
 const powers=contenders.map(n=>[n,sectorStrength(state,sectorId,n)]).sort((a,b)=>b[1]-a[1]),top=powers[0][1],tied=powers.filter(x=>x[1]===top).map(x=>x[0]);
 if(tied.length>1){for(const n of tied)for(const u of [...unitsIn(state,sectorId,n)]){const home=origins.get(u.id);if(home&&home!==sectorId)u.sectorId=home;}events.push({type:'stalemate',sectorId,title:'ÉGALITÉ DE PUISSANCE',detail:'Les unités engagées reviennent à leur position initiale.'});return;}
 const winner=powers[0][0],losers=contenders.filter(n=>n!==winner);let captured=0;
 for(const victim of losers)for(const u of [...unitsIn(state,sectorId,victim)]){if(u.type==='flag')continue;removeUnit(state,u.id);captured+=UNIT_TYPES[u.type].strength;if(state.nations[winner].reserve[u.type]!==undefined)state.nations[winner].reserve[u.type]=cap(state.nations[winner].reserve[u.type]+1,0,99);}
 state.nations[winner].power=cap(state.nations[winner].power+captured,0,9999);const oldOwner=state.owners[sectorId];state.owners[sectorId]=winner;if(oldOwner!==winner)state.nations[winner].power=cap(state.nations[winner].power+10,0,9999);
 events.push({type:'battle',sectorId,winner,title:'SECTEUR REMPORTÉ',detail:NATIONS[winner].name+' domine avec '+top+' de puissance.'});
 const sec=SECTOR_BY_ID.get(sectorId);if(sec.hq!==null&&sec.hq!==winner)captureFlag(state,winner,sec.hq,sectorId,events);
}
export function resolveTurn(source,options={}){
 const state=clone(source);if(state.winner!==null)return state;state.phase='resolving';const origins=new Map(state.units.map(u=>[u.id,u.sectorId])),events=[];
 const orders=state.orders.filter(o=>o.nation===state.humanNation).slice(0,MAX_ORDERS);if(options.ai!==false)for(let n=0;n<8;n++)if(n!==state.humanNation&&state.nations[n].active)orders.push(...aiOrders(state,n));
 for(const o of orders.filter(x=>x.type==='exchange')){const live=o.unitIds.map(id=>unitAt(state,id)).filter(Boolean);if(live.length!==o.unitIds.length)continue;for(const u of live)removeUnit(state,u.id);addUnit(state,o.toType,o.nation,o.sectorId);events.push({type:'exchange',sectorId:o.sectorId,nation:o.nation,title:'MONTÉE EN PUISSANCE',detail:UNIT_TYPES[o.toType].name+' déployé.'});}
 for(const o of orders.filter(x=>x.type==='reinforce')){const me=state.nations[o.nation],spec=UNIT_TYPES[o.unitType];if(!me.active||!spec||me.reserve[o.unitType]<1||me.power<o.cost)continue;me.power-=o.cost;me.reserve[o.unitType]--;addUnit(state,o.unitType,o.nation,'hq'+o.nation);events.push({type:'reinforce',sectorId:'hq'+o.nation,nation:o.nation,title:'RENFORT',detail:spec.name+' entre en jeu.'});}
 for(const o of orders.filter(x=>x.type==='move'))for(const id of o.unitIds){const u=unitAt(state,id);if(u&&u.nation===o.nation&&legalTargets(state,u.id).includes(o.target))u.sectorId=o.target;}
 for(const o of orders.filter(x=>x.type==='mega')){const me=state.nations[o.nation];if(!me.active||me.power<100)continue;me.power-=100;for(const u of [...unitsIn(state,o.target)])if(u.type!=='flag')removeUnit(state,u.id);events.push({type:'mega',sectorId:o.target,nation:o.nation,title:'MÉGA-MISSILE',detail:'Toutes les unités du secteur sont détruites. Le missile est consommé.'});}
 for(const s of SECTORS)resolveBattle(state,s.id,origins,events);
 for(const s of SECTORS){const present=[...new Set(unitsIn(state,s.id).filter(u=>u.type!=='flag'&&state.nations[u.nation].active).map(u=>u.nation))];if(present.length===1&&state.owners[s.id]!==present[0]){state.owners[s.id]=present[0];state.nations[present[0]].power=cap(state.nations[present[0]].power+10,0,9999);events.push({type:'territory',sectorId:s.id,winner:present[0],title:'TERRITOIRE CONQUIS',detail:NATIONS[present[0]].name+' gagne 10 Power.'});}}
 for(const s of SECTORS){if(s.hq===null)continue;for(const n of [...new Set(unitsIn(state,s.id).filter(u=>u.type!=='flag').map(u=>u.nation))])if(n!==s.hq&&state.nations[n].active)captureFlag(state,n,s.hq,s.id,events);}
 const active=state.nations.filter(n=>n.active);if(active.length===1){state.winner=active[0].id;events.push({type:'victory',winner:state.winner,title:'PUISSANCE TOTALE',detail:NATIONS[state.winner].name+' reste la dernière puissance active.'});}
 state.lastResolution={round:state.round,events:events.slice(-24)};state.history.push(state.lastResolution);state.history=state.history.slice(-20);state.round++;state.orders=[];state.phase=state.winner===null?'planning':'ended';state.seed=(state.seed*1664525+1013904223)>>>0;return state;
}
