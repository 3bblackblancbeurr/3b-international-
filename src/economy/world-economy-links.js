import {MEGA_BY_ID} from '../nexus/mega-catalog.js';
import {XP_REWARDS,COIN_REWARDS,levelFromXp} from './threeb-economy.js';
export const ECONOMY_ACTIONS={
 world_zone:{xp:XP_REWARDS.discoverZone,coins:0},world_secret:{xp:XP_REWARDS.discoverSecret,coins:COIN_REWARDS.discoverSecret},origin_relay:{xp:XP_REWARDS.activateRelay,coins:20},country_entry:{xp:XP_REWARDS.enterCountry,coins:10},mission_main:{xp:XP_REWARDS.mainMission,coins:COIN_REWARDS.mainMission},mission_side:{xp:XP_REWARDS.sideMission,coins:COIN_REWARDS.sideMission},guardian:{xp:XP_REWARDS.guardianMission,coins:COIN_REWARDS.guardianMission},nexus_unlock:{xp:1200,coins:250},nexus_first_build:{xp:XP_REWARDS.placeFirstBuilding,coins:25},city_event:{xp:XP_REWARDS.cityEvent,coins:COIN_REWARDS.cityEvent},daily_return:{xp:XP_REWARDS.dailyReturn,coins:5}
};
export function constructionPrice(id,upgrade=1){const b=MEGA_BY_ID[id];if(!b)return null;const level=Math.max(1,Math.min(5,Math.floor(upgrade)));return Math.round(b.cost*Math.pow(1.55,level-1));}
export function constructionRequirement(id,upgrade=1){const b=MEGA_BY_ID[id];if(!b)return null;return Math.min(150,Math.max(1,b.level+(Math.max(1,upgrade)-1)*3));}
export function canBuyConstruction(wallet,id,upgrade=1){const price=constructionPrice(id,upgrade),required=constructionRequirement(id,upgrade);if(price==null)return{ok:false,reason:'unknown'};if((wallet.level||levelFromXp(wallet.xp||0))<required)return{ok:false,reason:'level',required};if((wallet.coins||0)<price)return{ok:false,reason:'coins',price};return{ok:true,price,required};}
export function rewardForAction(action){const r=ECONOMY_ACTIONS[action];return r?{...r,token:0}:null;}
export function eventIdentity(action,contextId){return `${action}:${String(contextId||'').replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,120)}`;}
