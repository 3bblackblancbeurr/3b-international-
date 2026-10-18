import {appendHeartRateReading,decodeHeartRateMeasurement,wearableSupport} from './heart-rate-model.js';
const clone=value=>JSON.parse(JSON.stringify(value));

/** No persistence, background scan, server call, or automatic reconnection. */
export function createHeartRateController({bluetooth=globalThis.navigator?.bluetooth,secureContext=globalThis.isSecureContext,onChange=()=>{},now=()=>Date.now()}={}){
 const support=wearableSupport({bluetooth,secureContext});let epoch=0,disposed=false,device=null,characteristic=null,notificationHandler=null,disconnectHandler=null;
 let state={phase:support.available?'idle':'unavailable',support,deviceName:'',readings:[],battery:null,error:''};
 const snapshot=()=>clone(state),emit=()=>{if(!disposed)onChange(snapshot());},current=mark=>!disposed&&mark===epoch;
 function release(){
  const previous=device;if(characteristic&&notificationHandler)characteristic.removeEventListener('characteristicvaluechanged',notificationHandler);
  if(previous&&disconnectHandler)previous.removeEventListener('gattserverdisconnected',disconnectHandler);
  characteristic=null;notificationHandler=null;disconnectHandler=null;device=null;
  // Disconnecting GATT stops notifications without a late stopNotifications()
  // promise that could stop a subsequent session on the same characteristic.
  try{if(previous?.gatt?.connected)previous.gatt.disconnect();}catch{/* Device already out of range. */}
 }
 const controller={
  snapshot,
  async connect(){
   if(disposed||!support.available||['choosing','connecting','connected'].includes(state.phase))return snapshot();
   const mark=++epoch;release();state={...state,phase:'choosing',error:'',battery:null};emit();
   try{
    // Keep requestDevice in the click call stack: no await before the chooser.
    const selected=await bluetooth.requestDevice({filters:[{services:['heart_rate']}],optionalServices:['battery_service']});
    // Choosing grants permission but does not open GATT. A cancelled chooser
    // must not disconnect a device another current session may now be using.
    if(!current(mark))return snapshot();
    if(!selected?.gatt)throw Error('Ce capteur ne propose pas de connexion Bluetooth GATT.');device=selected;
    state={...state,phase:'connecting',deviceName:String(selected.name||'Capteur cardiaque').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160),readings:[]};
    disconnectHandler=()=>{if(!current(mark)||device!==selected)return;epoch++;release();state={...state,phase:'disconnected',battery:null,error:'Le capteur a été déconnecté. Les dernières mesures restent seulement dans cette session.'};emit();};selected.addEventListener('gattserverdisconnected',disconnectHandler);emit();
    const server=await selected.gatt.connect();if(!current(mark)){if(selected!==device)try{selected.gatt.disconnect();}catch{}return snapshot();}
    const service=await server.getPrimaryService('heart_rate');if(!current(mark))return snapshot();
    const stream=await service.getCharacteristic('heart_rate_measurement');if(!current(mark))return snapshot();characteristic=stream;
    notificationHandler=event=>{if(!current(mark)||device!==selected)return;try{const measurement=decodeHeartRateMeasurement(event.target.value);state={...state,readings:appendHeartRateReading(state.readings,measurement,now()),error:''};emit();}catch{state={...state,error:'Un paquet du capteur est incomplet ou non pris en charge. Il n’a pas été ajouté aux mesures.'};emit();}};
    stream.addEventListener('characteristicvaluechanged',notificationHandler);await stream.startNotifications();if(!current(mark))return snapshot();state={...state,phase:'connected',error:''};emit();
    // Battery is optional and never blocks the heart-rate stream.
    try{const batteryService=await server.getPrimaryService('battery_service');if(!current(mark))return snapshot();const batteryCharacteristic=await batteryService.getCharacteristic('battery_level');if(!current(mark))return snapshot();const value=await batteryCharacteristic.readValue();if(current(mark)&&value.byteLength===1&&value.getUint8(0)<=100){state={...state,battery:value.getUint8(0)};emit();}}catch{/* Honest absence: battery remains null. */}
   }catch(error){if(!current(mark))return snapshot();release();const cancelled=error?.name==='NotFoundError'||error?.name==='AbortError';state={...state,phase:cancelled?'idle':'error',error:cancelled?'Sélection annulée ou aucun capteur compatible sélectionné.':error?.name==='SecurityError'?'Le navigateur a refusé cet accès Bluetooth. Ouvre ce site en HTTPS et lance la sélection avec le bouton.':'La connexion au capteur n’a pas abouti. Vérifie sa compatibilité Heart Rate, son Bluetooth et sa disponibilité.'};emit();}
   return snapshot();
  },
  disconnect(){if(disposed)return snapshot();epoch++;release();state={...state,phase:support.available?'disconnected':'unavailable',battery:null,error:''};emit();return snapshot();},
  clear(){if(disposed)return snapshot();epoch++;release();state={phase:support.available?'idle':'unavailable',support,deviceName:'',readings:[],battery:null,error:''};emit();return snapshot();},
  dispose(){epoch++;release();disposed=true;state={phase:'unavailable',support,deviceName:'',readings:[],battery:null,error:''};}
 };
 return controller;
}
