import {DEFAULT_VEHICLE,normalizeVehicle,tuneVehicle} from './carModel.js';
import {GOLD_MASTER_BY_ID} from './productionCatalog.js';

const TUNING_PRESETS=Object.freeze({
  precision:{steeringRatio:.62,brakeBias:.60,suspension:.66,aeroBalance:.58,tirePressure:.55},
  endurance:{finalDrive:.44,suspension:.54,aeroBalance:.54,tirePressure:.56},
  balance:{suspension:.56,aeroBalance:.54,differential:.55,tirePressure:.53},
  acceleration:{finalDrive:.68,diffAccel:.68,launchControlRpm:.67,turboBoost:.62},
  handling:{steeringRatio:.68,suspension:.66,antiRollFront:.62,antiRollRear:.60,tirePressure:.57},
  aero:{aeroBalance:.68,rideHeight:.42,steeringRatio:.58,suspension:.62},
  durability:{suspension:.52,tractionControl:.74,absLevel:.80,tirePressure:.50},
  grip:{suspension:.68,tirePressure:.58,camberFront:.60,camberRear:.57,antiRollFront:.64,antiRollRear:.62},
  speed:{finalDrive:.62,aeroBalance:.63,rideHeight:.43,turboBoost:.66},
  drift:{differential:.70,diffAccel:.72,tractionControl:.28,steeringRatio:.72,camberFront:.62,camberRear:.52},
  climb:{finalDrive:.60,diffAccel:.66,tractionControl:.70,suspension:.60},
  heat:{turboBoost:.55,tirePressure:.48,tractionControl:.62},
  stability:{suspension:.54,antiRollFront:.56,antiRollRear:.56,tractionControl:.72},
});

const AWD_HINTS=['expedition','crossover','offroad','explorer','fortress','industrial-hauler','highland','snow','mountain'];
const defaultDrive=silhouette=>AWD_HINTS.some(x=>silhouette.includes(x))?'AWD':'RWD';

export function createGoldMasterVehicle(vehicleId,{modelAsset=null}={}){
  const spec=GOLD_MASTER_BY_ID[vehicleId];
  if(!spec)return normalizeVehicle(DEFAULT_VEHICLE);
  let vehicle=normalizeVehicle({
    ...DEFAULT_VEHICLE,
    id:spec.id,
    name:spec.displayName,
    productionRef:spec.id,
    bodyStyle:spec.silhouette,
    drive:defaultDrive(spec.silhouette),
  });
  const preset=TUNING_PRESETS[spec.tuningFocus]||TUNING_PRESETS.balance;
  for(const [key,value] of Object.entries(preset))if(key in vehicle.tune)vehicle=tuneVehicle(vehicle,key,value);
  return {...vehicle,modelAsset:typeof modelAsset==='string'&&modelAsset.endsWith('.glb')?modelAsset:null,productionRef:spec.id,productionMaterials:[...spec.materials]};
}

export function bindGoldMasterAsset(vehicle,modelAsset){
  const normalized=normalizeVehicle(vehicle);
  return {...normalized,modelAsset:typeof modelAsset==='string'&&modelAsset.endsWith('.glb')?modelAsset:null,productionRef:vehicle?.productionRef||null,productionMaterials:Array.isArray(vehicle?.productionMaterials)?[...vehicle.productionMaterials]:[]};
}
