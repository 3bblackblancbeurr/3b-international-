export const HEART_RATE_LIMIT=120;
const invalid=()=>{throw Error('Mesure Bluetooth incomplète ou non prise en charge.');};

/** Bluetooth SIG Heart Rate Measurement (0x2A37), little-endian. */
export function decodeHeartRateMeasurement(value){
 const view=value instanceof DataView?value:value instanceof Uint8Array?new DataView(value.buffer,value.byteOffset,value.byteLength):null;
 if(!view||view.byteLength<2||view.byteLength>512)invalid();const flags=view.getUint8(0);if(flags&0xe0)invalid();let offset=1;
 const read8=()=>{if(offset+1>view.byteLength)invalid();return view.getUint8(offset++);};
 const read16=()=>{if(offset+2>view.byteLength)invalid();const result=view.getUint16(offset,true);offset+=2;return result;};
 const bpm=flags&1?read16():read8(),contactSupported=!!(flags&4),contact=contactSupported?!!(flags&2):null,energyKj=flags&8?read16():null,rrIntervalsMs=[];
 if(flags&16){if(offset===view.byteLength||(view.byteLength-offset)%2)invalid();while(offset<view.byteLength)rrIntervalsMs.push(read16()*1000/1024);}
 if(offset!==view.byteLength)invalid();return {bpm,contact,energyKj,rrIntervalsMs};
}

function validReading(value){
 if(!value||!Number.isInteger(value.bpm)||value.bpm<0||value.bpm>65535||![null,true,false].includes(value.contact)||!(value.energyKj===null||Number.isInteger(value.energyKj)&&value.energyKj>=0&&value.energyKj<=65535)||!Array.isArray(value.rrIntervalsMs)||value.rrIntervalsMs.length>256||value.rrIntervalsMs.some(item=>!Number.isFinite(item)||item<0||item>65535*1000/1024)||typeof value.receivedAt!=='string'||!Number.isFinite(Date.parse(value.receivedAt)))invalid();
 return {bpm:value.bpm,contact:value.contact,energyKj:value.energyKj,rrIntervalsMs:[...value.rrIntervalsMs],receivedAt:value.receivedAt};
}
export function appendHeartRateReading(readings,measurement,now=Date.now()){
 if(!Array.isArray(readings)||!Number.isFinite(now))invalid();const item=validReading({...measurement,receivedAt:new Date(now).toISOString()});return [...readings.slice(-(HEART_RATE_LIMIT-1)).map(validReading),item];
}
const csv=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export function exportHeartRateCsv(readings,deviceName='Capteur cardiaque'){
 if(!Array.isArray(readings)||!readings.length||readings.length>HEART_RATE_LIMIT)throw Error('Aucune mesure de cette session à exporter.');
 const rows=readings.map(validReading).map(item=>[item.receivedAt,deviceName,item.bpm,item.contact===null?'non fourni':item.contact?'détecté':'non détecté',item.energyKj??'',item.rrIntervalsMs.join('|')].map(csv).join(';'));
 return '\uFEFFhorodatage_reception;capteur;bpm;contact_capteur;energie_kJ_cumulee;intervalles_RR_ms\r\n'+rows.join('\r\n')+'\r\n';
}
export function wearableSupport({bluetooth=globalThis.navigator?.bluetooth,secureContext=globalThis.isSecureContext}={}){
 if(secureContext!==true)return {available:false,reason:'La connexion au bracelet nécessite HTTPS ou localhost.'};
 if(typeof bluetooth?.requestDevice!=='function')return {available:false,reason:'Web Bluetooth n’est pas disponible dans ce navigateur. Essaie un navigateur compatible et un capteur Heart Rate Bluetooth LE.'};
 return {available:true,reason:'La disponibilité du capteur sera vérifiée dans le sélecteur Bluetooth du navigateur.'};
}
