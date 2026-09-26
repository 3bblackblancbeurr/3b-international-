import {MAX_ORDERS,NATIONS,UNIT_TYPES,EXCHANGES} from './constants.js';
import {SECTORS,SECTOR_BY_ID,pathDistance} from './board.js';
import {addUnit,unitAt,unitsIn,sectorStrength,removeUnit} from './state.js';
const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=v=>structuredClone(v);
function assertNation(state,nation){if(!Number.isInteger(nation)||nation<0||nation>7||!state.nations[nation].active)throw Error('Nation invalide.');}
function assertPlanning(state,nation){if(state.phase!=='planning'||state.winner!==null)throw Error('La phase de planification est fermée.');if(state.orders.filter(o=>o.nation===nation).length>=MAX_ORDERS)throw Error('Maximum de 5 ordres par manche.');}
function committedPower(state,nation){return state.orders.filter(o=>o.nation===nation).reduce((sum,o)=>sum+(o.cost||0),0);}
function reservedReinforcements(state,nation,type){return state.orders.filter(o=>o.nation===nation&&o.type==='reinforce'&&o.unitType===type).length;}
function reservedDeployments(state,nation,type){return state.orders.filter(o=>o.nation===nation&&o.type==='deploy'&&o.unitType===type).length;}
function isOrdered(state,id){return state.orders.some(o=>o.unitIds?.includes(id));}
export function legalTargets(state,unitId){
 const u=unitAt(state,unitId),spec=UNIT_TYPES[u?.type];if(!u||!spec||['fixed','special'].includes(spec.domain))return[];
 return SECTORS.filter(s=>{
  if(spec.domain==='land'&&!['land','coast'].includes(s.type))return false;if(spec.domain==='sea'&&!['sea','coast'].includes(s.type))return false;
  return pathDistance(u.sectorId,s.id,spec.domain,spec.move)<=spec.move&&s.id!==u.sectorId;
 }).map(s=>s.id);
}
export function queueMove(state,nation,unitIds,targetId){
 assertPlanning(state,nation);assertNation(state,nation);const ids=[...new Set(unitIds)];
 if(!ids.length)throw Error('Sélectionne une unité.');if(ids.length!==1)throw Error('Un ordre de déplacement concerne une seule pièce.');const us=ids.map(id=>unitAt(state,id));
 if(us.some(u=>!u||u.nation!==nation||isOrdered(state,u.id)))throw Error('Une unité ne peut recevoir qu’un ordre par manche.');
 const from=us[0].sectorId;if(us.some(u=>u.sectorId!==from))throw Error('Les unités d’un ordre doivent partir du même secteur.');
 if(!SECTOR_BY_ID.has(targetId)||us.some(u=>!legalTargets(state,u.id).includes(targetId)))throw Error('Destination hors de portée.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'move',nation,unitIds:ids,from,target:targetId});return state;
}
export function queueExchange(state,nation,sectorId,toType){
 assertPlanning(state,nation);assertNation(state,nation);const rule=EXCHANGES.find(r=>r.to===toType);if(!rule)throw Error('Échange inconnu.');
 const candidates=unitsIn(state,sectorId,nation).filter(u=>u.type===rule.from&&!isOrdered(state,u.id)).slice(0,rule.count);
 if(candidates.length<rule.count)throw Error('Pas assez de pièces pour cet échange.');if((state.nations[nation].reserve[toType]||0)<1)throw Error('Cette grande unité n’est plus disponible en réserve.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'exchange',nation,unitIds:candidates.map(u=>u.id),sectorId,fromType:rule.from,toType});return state;
}
export function queueReinforcement(state,nation,type){
 assertPlanning(state,nation);assertNation(state,nation);const spec=UNIT_TYPES[type];
 if(!spec||spec.tier!=='small')throw Error('Seules les petites unités peuvent être achetées avec des Power.');if(state.nations[nation].reserve[type]-reservedReinforcements(state,nation,type)<1)throw Error('Réserve épuisée.');if(state.nations[nation].power-committedPower(state,nation)<spec.cost)throw Error('Power insuffisant.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'reinforce',nation,unitIds:[],sectorId:'hq'+nation,unitType:type,cost:spec.cost});return state;
}
export function queueDeploy(state,nation,type){
 assertPlanning(state,nation);assertNation(state,nation);if(!UNIT_TYPES[type]||type==='flag')throw Error('Pièce capturée invalide.');if((state.nations[nation].spoils?.[type]||0)-reservedDeployments(state,nation,type)<1)throw Error('Aucune pièce capturée de ce type en réserve.');state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'deploy',nation,unitIds:[],sectorId:'hq'+nation,unitType:type});return state;
}
export function queueMegaMissile(state,nation,targetId){
 assertPlanning(state,nation);assertNation(state,nation);if(!SECTOR_BY_ID.has(targetId))throw Error('Cible invalide.');if(state.nations[nation].power-committedPower(state,nation)<100)throw Error('Il faut 100 Power disponible pour construire le Méga-missile.');
 if(state.orders.some(o=>o.nation===nation&&o.type==='mega'))throw Error('Un seul Méga-missile par manche.');
 state.orders.push({id:'o'+state.round+'-'+state.orders.length,type:'mega',nation,unitIds:[],target:targetId,cost:100});return state;
}
export function cancelOrder(state,nation,orderId){const i=state.orders.findIndex(o=>o.id===orderId&&o.nation===nation);if(i>=0)state.orders.splice(i,1);return state;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function targetScore(state,nation,u,targetId,random,difficulty){
 const s=SECTOR_BY_ID.get(targetId),enemy=unitsIn(state,targetId).filter(x=>x.nation!==nation&&x.type!=='flag'),enemyPower=enemy.reduce((sum,x)=>sum+UNIT_TYPES[x.type].strength,0);let score=0;
 if(s.hq!==null&&s.hq!==nation&&state.nations[s.hq].active)score+=u.type==='infantry'||u.type==='regiment'?180:62;
 if(enemy.length)score+=48+Math.min(35,enemyPower)-Math.max(0,enemyPower-UNIT_TYPES[u.type].strength)*1.2;
 if(state.owners[targetId]!==nation)score+=22;if(s.type==='sea'&&UNIT_TYPES[u.type].domain==='sea')score+=8;
 if(targetId==='hq'+nation)score-=35;const noise=difficulty==='elite'?0:difficulty==='veteran'?random()*12:random()*32;return score+noise;
}
function aiOrders(state,nation){
 const random=rng(state.seed+state.round*97+nation*997),orders=[],me=state.nations[nation],difficulty=state.difficulty,limit=difficulty==='normal'?3:difficulty==='elite'?5:4;if(!me.active)return orders;
 const used=new Set();
 for(const rule of EXCHANGES){if(orders.length>=limit||(me.reserve[rule.to]||0)<1)break;for(const s of SECTORS){const candidates=unitsIn(state,s.id,nation).filter(u=>u.type===rule.from&&!used.has(u.id)).slice(0,rule.count);if(candidates.length<rule.count)continue;orders.push({id:'ai-x-'+nation+'-'+orders.length,type:'exchange',nation,unitIds:candidates.map(u=>u.id),sectorId:s.id,fromType:rule.from,toType:rule.to});candidates.forEach(u=>used.add(u.id));break;}}
 if(me.power>=100&&orders.length<limit&&random()>(difficulty==='normal'?.72:.38)){const targets=SECTORS.filter(s=>s.hq!==null&&s.hq!==nation&&state.nations[s.hq].active).sort((a,b)=>sectorStrength(state,b.id,b.hq)-sectorStrength(state,a.id,a.hq));if(targets[0])orders.push({id:'ai-mega-'+nation,type:'mega',nation,unitIds:[],target:targets[0].id,cost:100});}
 const available=state.units.filter(u=>u.nation===nation&&u.type!=='flag'&&!used.has(u.id)).sort((a,b)=>UNIT_TYPES[b.type].strength-UNIT_TYPES[a.type].strength);
 for(const u of available){if(orders.length>=limit)break;if(orders.some(o=>o.unitIds?.includes(u.id)))continue;const targets=legalTargets(state,u.id);if(!targets.length)continue;const ranked=targets.map(id=>({id,score:targetScore(state,nation,u,id,random,difficulty)})).sort((a,b)=>b.score-a.score);const target=ranked[0]?.id;if(target)orders.push({id:'ai-'+nation+'-'+orders.length,type:'move',nation,unitIds:[u.id],from:u.sectorId,target});}
 const spoilType=Object.keys(me.spoils||{}).filter(type=>me.spoils[type]>0).sort((a,b)=>UNIT_TYPES[b].strength-UNIT_TYPES[a].strength)[0];if(orders.length<limit&&spoilType)orders.push({id:'ai-d-'+nation,type:'deploy',nation,unitIds:[],sectorId:'hq'+nation,unitType:spoilType});
 const spent=orders.reduce((sum,o)=>sum+(o.cost||0),0),budget=me.power-spent;
 if(orders.length<limit&&budget>=2){const choices=['destroyer','fighter','tank','infantry'].filter(type=>me.reserve[type]>0&&UNIT_TYPES[type].cost<=budget);if(choices.length){const type=choices.find(t=>UNIT_TYPES[t].cost<=budget)||'infantry';orders.push({id:'ai-r-'+nation,type:'reinforce',nation,unitIds:[],sectorId:'hq'+nation,unitType:type,cost:UNIT_TYPES[type].cost});}}
 return orders.slice(0,limit);
}
function captureFlag(state,winner,victim,sectorId,events){
 const flag=state.units.find(u=>u.type==='flag'&&u.nation===victim&&u.sectorId===sectorId);if(!flag)return;
 if(!unitsIn(state,sectorId,winner).some(u=>['infantry','regiment'].includes(u.type)))return;
 removeUnit(state,flag.id);const victor=state.nations[winner],loser=state.nations[victim];loser.active=false;victor.flagsCaptured++;
 for(const u of state.units.filter(u=>u.nation===victim)){if(victor.spoils?.[u.type]!==undefined)victor.spoils[u.type]=cap(victor.spoils[u.type]+1,0,99);}for(const type of Object.keys(victor.spoils||{})){victor.spoils[type]=cap(victor.spoils[type]+(loser.spoils?.[type]||0),0,99);if(loser.spoils)loser.spoils[type]=0;}victor.power=cap(victor.power+loser.power,0,9999);loser.power=0;state.units=state.units.filter(u=>u.nation!==victim);events.push({type:'flag',sectorId,winner,victim,title:'QG CONQUIS',detail:NATIONS[winner].name+' capture le drapeau '+NATIONS[victim].name+' et récupère sa réserve de campagne.'});
}
function resolveBattle(state,sectorId,origins,events){
 const contenders=[...new Set(unitsIn(state,sectorId).filter(u=>u.type!=='flag').map(u=>u.nation))].filter(n=>state.nations[n].active);if(contenders.length<2)return;
 const powers=contenders.map(n=>[n,sectorStrength(state,sectorId,n)]).sort((a,b)=>b[1]-a[1]),top=powers[0][1],tied=powers.filter(x=>x[1]===top).map(x=>x[0]);
 if(tied.length>1){for(const n of tied)for(const u of [...unitsIn(state,sectorId,n)]){const home=origins.get(u.id);if(home&&home!==sectorId)u.sectorId=home;}events.push({type:'stalemate',sectorId,title:'ÉGALITÉ DE PUISSANCE',detail:'Les unités engagées reviennent à leur position initiale.'});return;}
 const winner=powers[0][0],losers=contenders.filter(n=>n!==winner);
 for(const victim of losers)for(const u of [...unitsIn(state,sectorId,victim)]){if(u.type==='flag')continue;removeUnit(state,u.id);if(state.nations[winner].spoils?.[u.type]!==undefined)state.nations[winner].spoils[u.type]=cap(state.nations[winner].spoils[u.type]+1,0,99);}
 state.owners[sectorId]=winner;
 events.push({type:'battle',sectorId,winner,title:'SECTEUR REMPORTÉ',detail:NATIONS[winner].name+' domine avec '+top+' de puissance.'});
}
function distributePower(state,events){for(let n=0;n<8;n++){if(!state.nations[n].active)continue;let occupied=0;for(let opponent=0;opponent<8;opponent++){if(opponent===n||!state.nations[opponent].active)continue;const inCountry=['front'+opponent,'hq'+opponent].some(id=>unitsIn(state,id,n).some(u=>u.type!=='flag'));if(inCountry)occupied++;}const gain=Math.min(3,occupied);if(gain){state.nations[n].power=cap(state.nations[n].power+gain,0,9999);events.push({type:'power',winner:n,title:'POWER +'+gain,detail:NATIONS[n].name+' occupe '+occupied+' territoire(s) adverse(s).'});}}}
function applyNoCommandPenalty(state,nation,events){const own=state.orders.filter(o=>o.nation===nation);if(own.length)return;const me=state.nations[nation];if(me.power>0){me.power--;events.push({type:'penalty',winner:nation,title:'AUCUN ORDRE',detail:'1 Power perdu pour absence de commandement.'});return;}const weakest=state.units.filter(u=>u.nation===nation&&u.type!=='flag').sort((a,b)=>UNIT_TYPES[a.type].strength-UNIT_TYPES[b.type].strength)[0];if(!weakest)return;removeUnit(state,weakest.id);if(me.reserve[weakest.type]!==undefined)me.reserve[weakest.type]=cap(me.reserve[weakest.type]+1,0,99);me.power=cap(me.power+Math.max(0,UNIT_TYPES[weakest.type].strength-1),0,9999);events.push({type:'penalty',winner:nation,title:'AUCUN ORDRE',detail:UNIT_TYPES[weakest.type].name+' converti en Power avec pénalité.'});}
export function resolveTurn(source,options={}){
 const state=clone(source);if(state.winner!==null)return state;state.phase='resolving';const origins=new Map(state.units.map(u=>[u.id,u.sectorId])),events=[];
 if(options.penalty!==false)applyNoCommandPenalty(state,state.humanNation,events);const orders=state.orders.filter(o=>o.nation===state.humanNation).slice(0,MAX_ORDERS);if(options.ai!==false)for(let n=0;n<8;n++)if(n!==state.humanNation&&state.nations[n].active)orders.push(...aiOrders(state,n));
 for(const o of orders.filter(x=>x.type==='exchange')){const live=o.unitIds.map(id=>unitAt(state,id)).filter(Boolean),me=state.nations[o.nation];if(live.length!==o.unitIds.length||(me.reserve[o.toType]||0)<1)continue;for(const u of live)removeUnit(state,u.id);me.reserve[o.fromType]=cap((me.reserve[o.fromType]||0)+live.length,0,99);me.reserve[o.toType]--;addUnit(state,o.toType,o.nation,o.sectorId);events.push({type:'exchange',sectorId:o.sectorId,nation:o.nation,title:'MONTÉE EN PUISSANCE',detail:UNIT_TYPES[o.toType].name+' déployé.'});}
 for(const o of orders.filter(x=>x.type==='reinforce')){const me=state.nations[o.nation],spec=UNIT_TYPES[o.unitType];if(!me.active||!spec||me.reserve[o.unitType]<1||me.power<o.cost)continue;me.power-=o.cost;me.reserve[o.unitType]--;addUnit(state,o.unitType,o.nation,'hq'+o.nation);events.push({type:'reinforce',sectorId:'hq'+o.nation,nation:o.nation,title:'RENFORT',detail:spec.name+' entre en jeu.'});}
 for(const o of orders.filter(x=>x.type==='deploy')){const me=state.nations[o.nation],spec=UNIT_TYPES[o.unitType];if(!me.active||!spec||(me.spoils?.[o.unitType]||0)<1)continue;me.spoils[o.unitType]--;addUnit(state,o.unitType,o.nation,'hq'+o.nation);events.push({type:'deploy',sectorId:'hq'+o.nation,nation:o.nation,title:'PRISE REDÉPLOYÉE',detail:spec.name+' capturé rejoint le QG.'});}
 for(const o of orders.filter(x=>x.type==='move'))for(const id of o.unitIds){const u=unitAt(state,id);if(u&&u.nation===o.nation&&legalTargets(state,u.id).includes(o.target))u.sectorId=o.target;}
 for(const o of orders.filter(x=>x.type==='mega')){const me=state.nations[o.nation];if(!me.active||me.power<100)continue;me.power-=100;for(const u of [...unitsIn(state,o.target)])if(u.type!=='flag')removeUnit(state,u.id);events.push({type:'mega',sectorId:o.target,nation:o.nation,title:'MÉGA-MISSILE',detail:'Toutes les unités du secteur sont détruites. Le missile est consommé.'});}
 for(const s of SECTORS)resolveBattle(state,s.id,origins,events);
 for(const s of SECTORS){const present=[...new Set(unitsIn(state,s.id).filter(u=>u.type!=='flag'&&state.nations[u.nation].active).map(u=>u.nation))];if(present.length===1&&state.owners[s.id]!==present[0]){state.owners[s.id]=present[0];events.push({type:'territory',sectorId:s.id,winner:present[0],title:'TERRITOIRE CONQUIS',detail:NATIONS[present[0]].name+' prend le contrôle du secteur.'});}}
 distributePower(state,events);
 for(const s of SECTORS){if(s.hq===null)continue;for(const n of [...new Set(unitsIn(state,s.id).filter(u=>u.type!=='flag').map(u=>u.nation))])if(n!==s.hq&&state.nations[n].active)captureFlag(state,n,s.hq,s.id,events);}
 const active=state.nations.filter(n=>n.active);if(active.length===1){state.winner=active[0].id;events.push({type:'victory',winner:state.winner,title:'PUISSANCE TOTALE',detail:NATIONS[state.winner].name+' reste la dernière puissance active.'});}
 state.lastResolution={round:state.round,events:events.slice(-24)};state.history.push(state.lastResolution);state.history=state.history.slice(-20);state.round++;state.orders=[];state.phase=state.winner===null?'planning':'ended';state.seed=(state.seed*1664525+1013904223)>>>0;return state;
}
