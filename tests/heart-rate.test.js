import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendHeartRateReading,decodeHeartRateMeasurement,exportHeartRateCsv,HEART_RATE_LIMIT,wearableSupport} from '../src/health/wearable/heart-rate-model.js';
import {createHeartRateController} from '../src/health/wearable/heart-rate-controller.js';

const bytes=(...values)=>Uint8Array.from(values),tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function mockHardware({battery=74,noBattery=false,chooser,connectWait,notificationsWait}={}){
 class Characteristic extends EventTarget{async startNotifications(){if(notificationsWait)await notificationsWait.promise;return this;}emit(packet){this.value=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);this.dispatchEvent(new Event('characteristicvaluechanged'));}}
 const stream=new Characteristic(),requests=[];const device=new EventTarget();device.name='Capteur synthétique QA';let connections=0,disconnections=0;
 const server={async getPrimaryService(id){if(id==='heart_rate')return {async getCharacteristic(name){assert.equal(name,'heart_rate_measurement');return stream;}};if(noBattery)throw Error('Absent');assert.equal(id,'battery_service');return {async getCharacteristic(name){assert.equal(name,'battery_level');return {async readValue(){return new DataView(bytes(battery).buffer);}};}};}};
 device.gatt={connected:false,async connect(){connections++;if(connectWait)await connectWait.promise;this.connected=true;return server;},disconnect(){disconnections++;const wasConnected=this.connected;this.connected=false;if(wasConnected)device.dispatchEvent(new Event('gattserverdisconnected'));}};
 const bluetooth={requestDevice(options){requests.push(options);return chooser?chooser.promise:Promise.resolve(device);}};
 return {bluetooth,device,stream,requests,get connections(){return connections;},get disconnections(){return disconnections;}};
}
test('Heart Rate Measurement decodes uint8/uint16, contact, energy and all RR entries',()=>{
 assert.deepEqual(decodeHeartRateMeasurement(bytes(0,72)),{bpm:72,contact:null,energyKj:null,rrIntervalsMs:[]});
 assert.deepEqual(decodeHeartRateMeasurement(bytes(0x1f,44,1,7,0,0,4,0,2)),{bpm:300,contact:true,energyKj:7,rrIntervalsMs:[1000,500]});
 assert.equal(decodeHeartRateMeasurement(bytes(4,0)).contact,false);assert.equal(decodeHeartRateMeasurement(bytes(2,72)).contact,null);
 const backing=bytes(255,0,80,255);assert.equal(decodeHeartRateMeasurement(new DataView(backing.buffer,1,2)).bpm,80);
});
test('invalid packets reject missing or odd fields, reserved flags, trailing and excessive data',()=>{
 for(const packet of [bytes(),bytes(0),bytes(1,4),bytes(8,72,1),bytes(16,72),bytes(16,72,0),bytes(32,72),bytes(0,72,10),new Uint8Array(513)])assert.throws(()=>decodeHeartRateMeasurement(packet),/incomplète/);
 assert.throws(()=>decodeHeartRateMeasurement([0,72]));
});
test('readings are immutable, capped at 120 and CSV contains only explicit session data',()=>{
 let readings=[];for(let i=0;i<125;i++)readings=appendHeartRateReading(readings,{bpm:i,contact:null,energyKj:null,rrIntervalsMs:[]},1700000000000+i);
 assert.equal(readings.length,HEART_RATE_LIMIT);assert.equal(readings[0].bpm,5);const old=structuredClone(readings),next=appendHeartRateReading(readings,{bpm:99,contact:true,energyKj:0,rrIntervalsMs:[1000]},1700000005000);assert.deepEqual(readings,old);assert.equal(next.length,120);
 const csv=exportHeartRateCsv([next.at(-1)],'=danger;"name"');assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/'=danger;""name""/);assert.match(csv,/'?détecté/);assert.match(csv,/1000/);assert.throws(()=>exportHeartRateCsv([]));assert.throws(()=>appendHeartRateReading([],{bpm:NaN},0));
});
test('support status never pretends a device exists and secure context is required',()=>{
 assert.equal(wearableSupport({secureContext:false,bluetooth:{requestDevice(){}}}).available,false);assert.equal(wearableSupport({secureContext:true,bluetooth:{}}).available,false);assert.equal(wearableSupport({secureContext:true,bluetooth:{requestDevice(){}}}).available,true);
});
test('chooser is invoked synchronously with only Heart Rate and optional battery permissions',async()=>{
 const hardware=mockHardware(),changes=[],controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true,onChange:value=>changes.push(value),now:()=>1700000000000});
 const connecting=controller.connect();assert.equal(hardware.requests.length,1);assert.deepEqual(hardware.requests[0],{filters:[{services:['heart_rate']}],optionalServices:['battery_service']});await connecting;
 assert.equal(controller.snapshot().phase,'connected');assert.equal(controller.snapshot().battery,74);assert.equal(controller.snapshot().readings.length,0);
 hardware.stream.emit(bytes(6,77));assert.equal(controller.snapshot().readings[0].bpm,77);const copy=controller.snapshot();copy.readings[0].bpm=1;assert.equal(controller.snapshot().readings[0].bpm,77);
 hardware.stream.emit(bytes(16,72,1));assert.match(controller.snapshot().error,/paquet/);assert.equal(controller.snapshot().readings.length,1);hardware.stream.emit(bytes(0,78));assert.equal(controller.snapshot().error,'');
 controller.disconnect();assert.equal(controller.snapshot().phase,'disconnected');assert.equal(hardware.device.gatt.connected,false);hardware.stream.emit(bytes(0,99));assert.equal(controller.snapshot().readings.length,2);
 controller.clear();assert.equal(controller.snapshot().readings.length,0);assert.equal(controller.snapshot().deviceName,'');assert.ok(changes.length>3);
});
test('missing battery does not stop the real stream and no duplicate chooser is opened',async()=>{
 const choice=deferred(),hardware=mockHardware({noBattery:true,chooser:choice}),controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true});const pending=controller.connect();await controller.connect();assert.equal(hardware.requests.length,1);choice.resolve(hardware.device);await pending;assert.equal(controller.snapshot().phase,'connected');assert.equal(controller.snapshot().battery,null);controller.dispose();
});
test('cancelled chooser and unavailable browsers never fabricate successful readings',async()=>{
 const controller=createHeartRateController({secureContext:true,bluetooth:{requestDevice:()=>Promise.reject(Object.assign(Error('cancel'),{name:'NotFoundError'}))}});await controller.connect();assert.equal(controller.snapshot().phase,'idle');assert.equal(controller.snapshot().readings.length,0);assert.match(controller.snapshot().error,/annulée/);
 const unavailable=createHeartRateController({secureContext:false,bluetooth:{requestDevice:()=>assert.fail()}});await unavailable.connect();assert.equal(unavailable.snapshot().phase,'unavailable');
});
test('chooser resolved after cancellation cannot connect or emit late data',async()=>{
 const choice=deferred(),hardware=mockHardware({chooser:choice}),changes=[],controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true,onChange:value=>changes.push(value)});const pending=controller.connect();controller.disconnect();const count=changes.length;choice.resolve(hardware.device);await pending;assert.equal(hardware.connections,0);assert.equal(hardware.disconnections,0);assert.equal(changes.length,count);assert.equal(controller.snapshot().phase,'disconnected');
});
test('late GATT connection after cancellation is disconnected and never becomes active',async()=>{
 const wait=deferred(),hardware=mockHardware({connectWait:wait}),controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true});const pending=controller.connect();await tick();assert.equal(controller.snapshot().phase,'connecting');controller.disconnect();wait.resolve();await pending;assert.equal(hardware.device.gatt.connected,false);assert.equal(controller.snapshot().phase,'disconnected');assert.equal(controller.snapshot().readings.length,0);
});
test('unmount during notifications and unexpected disconnection discard listeners safely',async()=>{
 const wait=deferred(),hardware=mockHardware({notificationsWait:wait}),changes=[],controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true,onChange:value=>changes.push(value)});const pending=controller.connect();await tick();controller.dispose();const count=changes.length;wait.resolve();await pending;hardware.stream.emit(bytes(0,80));assert.equal(changes.length,count);assert.equal(controller.snapshot().readings.length,0);assert.equal(hardware.device.gatt.connected,false);
 const second=mockHardware(),active=createHeartRateController({bluetooth:second.bluetooth,secureContext:true});await active.connect();second.stream.emit(bytes(0,70));second.device.gatt.disconnect();assert.equal(active.snapshot().phase,'disconnected');second.stream.emit(bytes(0,71));assert.equal(active.snapshot().readings.length,1);active.dispose();
});
test('rapid readings are capped and controller model has no storage, AI or network calls',async()=>{
 const hardware=mockHardware(),controller=createHeartRateController({bluetooth:hardware.bluetooth,secureContext:true});await controller.connect();for(let i=0;i<150;i++)hardware.stream.emit(bytes(0,i));assert.equal(controller.snapshot().readings.length,120);assert.equal(controller.snapshot().readings[0].bpm,30);controller.dispose();
 for(const name of ['heart-rate-model.js','heart-rate-controller.js'])assert.doesNotMatch(readFileSync(new URL('../src/health/wearable/'+name,import.meta.url),'utf8'),/\bfetch\s*\(|localStorage|indexedDB|OPENAI|ANTHROPIC|ecosystem\(/);
});
