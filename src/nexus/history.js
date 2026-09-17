import {normalizeCity} from './city-save.js';
export const HISTORY_LIMIT=60;
export function createCityHistory(city){return{past:[],present:normalizeCity(city),future:[]};}
export function commitCity(history,next){const normalized=normalizeCity(next);if(JSON.stringify(normalized)===JSON.stringify(history.present))return history;return{past:[...history.past.slice(-(HISTORY_LIMIT-1)),history.present],present:normalized,future:[]};}
export function undoCity(history){if(!history.past.length)return history;const previous=history.past.at(-1);return{past:history.past.slice(0,-1),present:previous,future:[history.present,...history.future].slice(0,HISTORY_LIMIT)};}
export function redoCity(history){if(!history.future.length)return history;const next=history.future[0];return{past:[...history.past,history.present].slice(-HISTORY_LIMIT),present:next,future:history.future.slice(1)};}
