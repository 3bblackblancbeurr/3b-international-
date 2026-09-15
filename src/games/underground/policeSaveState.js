import {createPursuitState} from './policePursuitSystem.js';
export const PURSUIT_SAVE_VERSION=1;
export function serializePursuitState(state){return {version:PURSUIT_SAVE_VERSION,countryId:state.countryId,seed:state.seed,heatPoints:Math.max(0,Math.round(state.heatPoints||0)),reputation:Math.max(0,Math.round(state.reputation||0)),escapeChain:Math.max(0,Math.round(state.escapeChain||0))};}
export function restorePursuitState(data={}){const base=createPursuitState({countryId:data.countryId||'france',seed:Number.isFinite(data.seed)?data.seed:1});if(data.version!==PURSUIT_SAVE_VERSION)return base;return {...base,heatPoints:Math.max(0,Number(data.heatPoints)||0),reputation:Math.max(0,Number(data.reputation)||0),escapeChain:Math.max(0,Number(data.escapeChain)||0)};}
