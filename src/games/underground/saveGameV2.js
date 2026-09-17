import {createCareerState} from './careerProgressionV2.js';import {createGarageState} from './garageSystemV2.js';import {normalizeGameSettings} from './gameSettingsV2.js';
export const UNDERGROUND_SAVE_VERSION=2;
export function createSaveGame(){return {version:UNDERGROUND_SAVE_VERSION,career:createCareerState(),garage:createGarageState(),settings:normalizeGameSettings(),stats:{playSeconds:0,races:0,wins:0,escapes:0,arrests:0},updatedAt:null};}
export function normalizeSaveGame(value={}){const base=createSaveGame();if(value.version!==UNDERGROUND_SAVE_VERSION)return base;return {...base,...value,career:{...base.career,...(value.career||{})},garage:{...base.garage,...(value.garage||{})},settings:normalizeGameSettings(value.settings||{}),stats:{...base.stats,...(value.stats||{})}};}
export function touchSaveGame(save,patch={}){return normalizeSaveGame({...save,...patch,version:UNDERGROUND_SAVE_VERSION,updatedAt:new Date().toISOString()});}
