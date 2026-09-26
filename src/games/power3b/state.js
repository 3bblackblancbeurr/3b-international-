import {NATIONS,UNIT_TYPES} from './constants.js';
import {SECTORS,SECTOR_BY_ID} from './board.js';
const clone=v=>structuredClone(v);
const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
const makeReserve=()=>({infantry:4,regiment:2,tank:2,fighter:2,bomber:1,destroyer:2,cruiser:1});
export function addUnit(state,type,nation,sectorId){
 const unit={id:'u'+state.nextUnitId++,type,nation,sectorId};state.units.push(unit);return unit;
}
export function createPowerGame(options={}){
 if(options.snapshot)return validatePowerSnapshot(options.snapshot);
 const nation=Number.isInteger(options.nation)?cap(options.nation,0,7):0;
 const state={version:1,seed:Number.isInteger(options.seed)?options.seed:196,round:1,phase:'planning',humanNation:nation,difficulty:['normal','veteran','elite'].includes(options.difficulty)?options.difficulty:'veteran',nextUnitId:1,winner:null,units:[],orders:[],owners:{},nations:NATIONS.map((x,i)=>({id:i,active:true,power:30,flagsCaptured:0,reserve:makeReserve()})),history:[],lastResolution:null};
 for(const s of SECTORS)state.owners[s.id]=s.hq??null;
 for(let n=0;n<8;n++){
  addUnit(state,'flag',n,'hq'+n);addUnit(state,'infantry',n,'hq'+n);addUnit(state,'infantry',n,'hq'+n);addUnit(state,'tank',n,'hq'+n);addUnit(state,'fighter',n,'hq'+n);
  addUnit(state,'infantry',n,'front'+n);addUnit(state,'regiment',n,'front'+n);addUnit(state,'destroyer',n,'sea'+n);
 }
 return state;
}
export function unitAt(state,id){return state.units.find(u=>u.id===id)||null;}
export function unitsIn(state,sectorId,nation=null){return state.units.filter(u=>u.sectorId===sectorId&&(nation===null||u.nation===nation));}
export function sectorStrength(state,sectorId,nation){return unitsIn(state,sectorId,nation).reduce((sum,u)=>sum+(UNIT_TYPES[u.type]?.strength||0),0);}
export function removeUnit(state,id){const i=state.units.findIndex(u=>u.id===id);return i>=0?state.units.splice(i,1)[0]:null;}
export function gameScore(state,nation=state.humanNation){
 const me=state.nations[nation],territory=Object.values(state.owners).filter(x=>x===nation).length;
 const force=state.units.filter(u=>u.nation===nation).reduce((a,u)=>a+(UNIT_TYPES[u.type]?.strength||0),0);
 return me.flagsCaptured*500+territory*25+force*10+me.power;
}
export function snapshotPowerGame(state){const out=clone(state);out.orders=[];out.lastResolution=null;return out;}
export function validatePowerSnapshot(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)throw Error('Sauvegarde Power 3B invalide.');
 if(JSON.stringify(value).length>120000)throw Error('Sauvegarde Power 3B trop volumineuse.');
 const human=Number.isInteger(value.humanNation)?cap(value.humanNation,0,7):0;
 const state=createPowerGame({nation:human,seed:Number.isInteger(value.seed)?value.seed:196,difficulty:value.difficulty});
 state.round=cap(Number.isFinite(value.round)?Math.trunc(value.round):1,1,9999);
 state.winner=Number.isInteger(value.winner)&&value.winner>=0&&value.winner<8?value.winner:null;
 state.phase=state.winner===null?'planning':'ended';state.units=[];state.nextUnitId=1;
 if(Array.isArray(value.nations)&&value.nations.length===8)state.nations=state.nations.map((base,i)=>{
  const src=value.nations[i]||{},reserve={...base.reserve};
  for(const key of Object.keys(reserve))reserve[key]=cap(Number.isFinite(src.reserve?.[key])?Math.trunc(src.reserve[key]):reserve[key],0,99);
  return{...base,active:src.active!==false,power:cap(Number.isFinite(src.power)?Math.trunc(src.power):30,0,9999),flagsCaptured:cap(Number.isFinite(src.flagsCaptured)?Math.trunc(src.flagsCaptured):0,0,7),reserve};
 });
 const seen=new Set();
 for(const raw of Array.isArray(value.units)?value.units.slice(0,320):[]){
  if(!raw||typeof raw!=='object'||!UNIT_TYPES[raw.type]||!Number.isInteger(raw.nation)||raw.nation<0||raw.nation>7||!SECTOR_BY_ID.has(raw.sectorId))continue;
  const id=typeof raw.id==='string'&&/^u\d+$/.test(raw.id)&&!seen.has(raw.id)?raw.id:'u'+state.nextUnitId++;
  seen.add(id);state.units.push({id,type:raw.type,nation:raw.nation,sectorId:raw.sectorId});
  const num=Number(id.slice(1));if(Number.isInteger(num))state.nextUnitId=Math.max(state.nextUnitId,num+1);
 }
 state.owners={};for(const s of SECTORS){const o=value.owners?.[s.id];state.owners[s.id]=Number.isInteger(o)&&o>=0&&o<8?o:(s.hq??null);}
 state.orders=[];state.history=Array.isArray(value.history)?value.history.slice(-20).map(h=>({round:cap(Number(h.round)||1,1,9999),events:Array.isArray(h.events)?h.events.slice(-24).map(e=>({type:String(e.type||'event').slice(0,24),sectorId:SECTOR_BY_ID.has(e.sectorId)?e.sectorId:null,winner:Number.isInteger(e.winner)?cap(e.winner,0,7):undefined,victim:Number.isInteger(e.victim)?cap(e.victim,0,7):undefined,title:String(e.title||'').slice(0,80),detail:String(e.detail||'').slice(0,180)})):[]})):[];
 state.lastResolution=null;return state;
}
