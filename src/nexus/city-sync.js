import {normalizeCity,applyCityOps} from './city-save.js';
export function createSyncState(city){const c=normalizeCity(city);return{serverRevision:c.revision||0,base:c,pending:[],lastSyncedAt:0};}
export function queueCityOp(state,op){return{...state,pending:[...state.pending,op].slice(-500)};}
export function acknowledgeSync(state,serverCity){const server=normalizeCity(serverCity);return{serverRevision:server.revision||0,base:server,pending:[],lastSyncedAt:Date.now()};}
export function reconcileCityConflict(state,serverCity){const server=normalizeCity(serverCity);const rebased=applyCityOps(server,state.pending);return{serverRevision:server.revision||0,base:rebased,pending:[...state.pending],lastSyncedAt:state.lastSyncedAt,conflict:true};}
export function materializeSyncCity(state){return applyCityOps(state.base,state.pending);}
export function syncPayload(state){return{expectedRevision:state.serverRevision,operations:state.pending.slice(0,200)};}
