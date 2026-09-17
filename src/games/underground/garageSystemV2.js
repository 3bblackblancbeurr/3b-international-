import {repairCost} from './economyBalanceV2.js';
export function createGarageState(){return {owned:[],activeVehicleId:null,setups:{},damage:{},favorites:[]};}
export function addVehicleToGarage(state,vehicleId,{setup=null}={}){if(!vehicleId||state.owned.includes(vehicleId))return state;return {...state,owned:[...state.owned,vehicleId],activeVehicleId:state.activeVehicleId||vehicleId,setups:{...state.setups,[vehicleId]:setup||{}},damage:{...state.damage,[vehicleId]:0}};}
export function setActiveVehicle(state,vehicleId){return state.owned.includes(vehicleId)?{...state,activeVehicleId:vehicleId}:state;}
export function saveVehicleSetup(state,vehicleId,setup){if(!state.owned.includes(vehicleId))return state;return {...state,setups:{...state.setups,[vehicleId]:structuredClone(setup||{})}};}
export function setVehicleDamage(state,vehicleId,damage){if(!state.owned.includes(vehicleId))return state;return {...state,damage:{...state.damage,[vehicleId]:Math.max(0,Math.min(100,Number(damage)||0))}};}
export function repairVehicle(state,vehicleId,{balance=0,vehicleValue=20000}={}){const damage=state.damage[vehicleId]||0,cost=repairCost({damage,vehicleValue});if(balance<cost)return {state,balance,cost,ok:false};return {state:{...state,damage:{...state.damage,[vehicleId]:0}},balance:balance-cost,cost,ok:true};}
export function toggleFavorite(state,vehicleId){if(!state.owned.includes(vehicleId))return state;const has=state.favorites.includes(vehicleId);return {...state,favorites:has?state.favorites.filter(x=>x!==vehicleId):[...state.favorites,vehicleId]};}
