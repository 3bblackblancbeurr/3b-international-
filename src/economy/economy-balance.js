import {levelFromXp} from './threeb-economy.js';
export const DAILY_LIMITS={xp:5000,coins:800,repeatableMissionCoins:300,eventCoins:250};
export const CITY_ECONOMY={
 upkeepIntervalMinutes:60,
 income:[{type:'home',coins:1},{type:'shop',coins:4},{type:'restaurant',coins:5},{type:'workshop',coins:6},{type:'factory',coins:9},{type:'hotel',coins:10},{type:'culture',coins:2},{type:'stadium',coins:6},{type:'port',coins:8}],
 upkeep:[{type:'tower',coins:3},{type:'skyscraper',coins:6},{type:'hospital',coins:4},{type:'stadium',coins:5},{type:'energy',coins:2},{type:'transit',coins:3}],
};
export const LEVEL_MILESTONES=[5,10,20,30,40,50,75,100,125,150].map(level=>({level,coins:level*4,badge:`niveau-${level}`,unlock:level>=100?'prestige':level>=50?'monument':level>=20?'district':'style'}));
export function clampDailyEarnings(ledger={},gain={}){const xp=Math.min(Math.max(0,gain.xp||0),Math.max(0,DAILY_LIMITS.xp-(ledger.xp||0)));const coins=Math.min(Math.max(0,gain.coins||0),Math.max(0,DAILY_LIMITS.coins-(ledger.coins||0)));return{xp,coins};}
export function milestoneRewards(oldXp,newXp){const a=levelFromXp(oldXp),b=levelFromXp(newXp);return LEVEL_MILESTONES.filter(m=>m.level>a&&m.level<=b);}
export function cityHourlyNet(buildings=[]){let income=0,upkeep=0;for(const b of buildings){income+=(CITY_ECONOMY.income.find(x=>x.type===b.type)?.coins||0)*(b.level||1);upkeep+=(CITY_ECONOMY.upkeep.find(x=>x.type===b.type)?.coins||0)*(b.level||1);}return{income,upkeep,net:income-upkeep};}
export function validateWalletDelta(before,after){if(!before||!after)return false;for(const key of ['xp','coins'])if(!Number.isSafeInteger(after[key])||after[key]<0)return false;return after.token===0||after.token==null;}
