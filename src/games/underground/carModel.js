import {VEHICLE_CLASSES} from './data.js';
import {DEFAULT_CUSTOMIZATION,normalizeCustomization} from './customization.js';
import {DEFAULT_PLATFORM_ID,VEHICLE_PLATFORM_VERSION,normalizePlatformId} from './vehiclePlatform.js';

const G=9.80665,RHO=1.225;
export const UPGRADE_KEYS=['engine','intake','ecu','fuel','exhaust','turbo','intercooler','cooling','clutch','transmission','differential','tires','brakes','suspension','aero','weight','nitrous','electronics'];

export const DEFAULT_TUNE=Object.freeze({
  finalDrive:.5,brakeBias:.58,suspension:.5,differential:.5,aeroBalance:.5,tirePressure:.5,
  camberFront:.5,camberRear:.5,toeFront:.5,toeRear:.5,rideHeight:.5,springRate:.5,
  damperBump:.5,damperRebound:.5,antiRollFront:.5,antiRollRear:.5,steeringRatio:.5,
  diffAccel:.5,diffDecel:.5,tractionControl:.65,absLevel:.75,launchControlRpm:.45,turboBoost:.5,
});

export const DEFAULT_VEHICLE={
  id:'prototype-01',name:'Prototype 3B',modelAsset:null,
  platformId:DEFAULT_PLATFORM_ID,platformVersion:VEHICLE_PLATFORM_VERSION,bodyStyle:'sports-coupe',
  massKg:1420,powerKw:170,torqueNm:330,drive:'RWD',gears:6,
  cd:0.31,frontalAreaM2:2.08,rollingResistance:0.012,
  tireMu:1.04,brakeMu:1.15,wheelbaseM:2.68,maxSteerRad:0.57,
  downforceCoeff:0.12,response:0.76,stability:0.78,
  upgrades:Object.fromEntries(UPGRADE_KEYS.map(k=>[k,0])),
  tune:{...DEFAULT_TUNE},
  customization:structuredClone(DEFAULT_CUSTOMIZATION),
};

const level=(vehicle,key)=>Math.max(0,Math.min(5,Number(vehicle?.upgrades?.[key])||0));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normalizeModelAsset=value=>typeof value==='string'&&(/\.glb(?:$|\?)/i.test(value)||/^https?:\/\//i.test(value))?value:null;

export function normalizeVehicle(vehicle=DEFAULT_VEHICLE){
  // Save/career normalization never trusts an arbitrary model path. A production asset is rebound explicitly by productionVehicleFactory after normalization.
  const v={...DEFAULT_VEHICLE,...vehicle,modelAsset:null};
  v.platformId=normalizePlatformId(vehicle?.platformId);v.platformVersion=VEHICLE_PLATFORM_VERSION;v.bodyStyle=typeof vehicle?.bodyStyle==='string'?vehicle.bodyStyle:DEFAULT_VEHICLE.bodyStyle;
  v.upgrades={...DEFAULT_VEHICLE.upgrades,...(vehicle?.upgrades||{})};
  v.tune={...DEFAULT_TUNE,...(vehicle?.tune||{})};
  for(const k of Object.keys(v.tune))v.tune[k]=clamp(Number(v.tune[k])||0,0,1);
  v.customization=normalizeCustomization(vehicle?.customization);
  return v;
}

export function effectiveSpec(vehicle=DEFAULT_VEHICLE){
  const v=normalizeVehicle(vehicle);
  const L=k=>level(v,k);
  const engine=L('engine'),intake=L('intake'),ecu=L('ecu'),fuel=L('fuel'),exhaust=L('exhaust'),turbo=L('turbo'),intercooler=L('intercooler'),cooling=L('cooling'),clutch=L('clutch'),trans=L('transmission'),diff=L('differential'),tires=L('tires'),brakes=L('brakes'),susp=L('suspension'),aero=L('aero'),weight=L('weight'),nitrous=L('nitrous'),electronics=L('electronics');
  const boostTune=.94+v.tune.turboBoost*.12;
  const power=v.powerKw*(1+engine*.052+intake*.018+ecu*.026+fuel*.017+exhaust*.021+turbo*.066+intercooler*.019+cooling*.006)*boostTune;
  const mass=Math.max(820,v.massKg*(1-trans*.004-weight*.018));
  const chassisTune=1+susp*.016+diff*.008+(v.tune.springRate-.5)*.025+(v.tune.damperRebound-.5)*.02;
  const tirePressure=0.96+v.tune.tirePressure*.08;
  const camberPenalty=1-Math.abs(v.tune.camberFront-.56)*.035-Math.abs(v.tune.camberRear-.54)*.028;
  const tireMu=v.tireMu*(1+tires*.045)*chassisTune*tirePressure*camberPenalty;
  const absAssist=.97+v.tune.absLevel*.045+electronics*.004;
  const brakeMu=v.brakeMu*(1+brakes*.055)*absAssist*(0.985-Math.abs(v.tune.brakeBias-.58)*.07);
  const rideDrag=(v.tune.rideHeight-.5)*.02;
  const cd=v.cd*(1+aero*.005+(v.tune.aeroBalance-.5)*.025+rideDrag);
  const downforce=v.downforceCoeff+aero*.052+v.tune.aeroBalance*.062+(0.5-v.tune.rideHeight)*.04;
  const steeringFactor=.9+v.tune.steeringRatio*.2;
  const diffFactor=.96+v.tune.diffAccel*.06+diff*.012;
  const response=clamp(v.response+engine*.01+intake*.006+ecu*.008+turbo*.007+clutch*.028+trans*.024+diff*.012+susp*.014+electronics*.006+(v.tune.damperBump-.5)*.025,0,1.35);
  const stability=clamp(v.stability+susp*.015+aero*.012+electronics*.012+(v.tune.antiRollFront+v.tune.antiRollRear-1)*.035,0.35,1.25);
  const nitrousKw=nitrous?28+nitrous*18:0;
  const launchGrip=.94+v.tune.launchControlRpm*.06+v.tune.tractionControl*.04+electronics*.005;
  return {...v,powerKwEff:power,massKgEff:mass,tireMuEff:tireMu,brakeMuEff:brakeMu,cdEff:cd,downforceCoeffEff:downforce,responseEff:response,stabilityEff:stability,nitrousKw,steeringFactor,diffFactor,launchGrip};
}

function dragForce(spec,speed){return .5*RHO*spec.cdEff*spec.frontalAreaM2*speed*speed;}
function rollingForce(spec){return spec.rollingResistance*spec.massKgEff*G;}
function tractionForce(spec,speed){const downforce=.5*RHO*spec.frontalAreaM2*spec.downforceCoeffEff*speed*speed;const driven=spec.drive==='AWD'?1:spec.drive==='FWD'?.58:.62;return spec.tireMuEff*(spec.massKgEff*G*driven+downforce*.62)*spec.diffFactor;}

export function estimateTopSpeedKph(vehicle=DEFAULT_VEHICLE){const s=effectiveSpec(vehicle),power=s.powerKwEff*1000*.88;let lo=5,hi=140;for(let i=0;i<55;i++){const mid=(lo+hi)/2,need=dragForce(s,mid)*mid+rollingForce(s)*mid;if(need<power)lo=mid;else hi=mid;}return Math.round(lo*3.6);}
export function estimateZeroToHundred(vehicle=DEFAULT_VEHICLE){const s=effectiveSpec(vehicle);let speed=0,time=0,dt=.01;while(speed<27.7778&&time<20){const usablePower=s.powerKwEff*1000*.87;const powerForce=usablePower/Math.max(4,speed);const traction=tractionForce(s,speed)*(speed<8?s.launchGrip:1);const force=Math.min(powerForce,traction)-dragForce(s,speed)-rollingForce(s);speed=Math.max(0,speed+Math.max(0,force/s.massKgEff)*dt);time+=dt;}return Number(time.toFixed(2));}
export function performanceIndex(vehicle=DEFAULT_VEHICLE){const s=effectiveSpec(vehicle),top=estimateTopSpeedKph(s),zero=estimateZeroToHundred(s);const accel=clamp((9.5-zero)/7,0,1.25),speed=clamp((top-150)/280,0,1.25);const grip=clamp((s.tireMuEff-.75)/.8,0,1.25),brake=clamp((s.brakeMuEff-.8)/.8,0,1.25);const response=clamp(s.responseEff/1.2,0,1.2),aero=clamp((s.downforceCoeffEff+.05)/.6,0,1.25);const raw=100+899*(accel*.27+speed*.22+grip*.2+brake*.13+response*.1+aero*.08);return clamp(Math.round(raw),100,999);}
export function vehicleClass(vehicle=DEFAULT_VEHICLE){const pi=performanceIndex(vehicle);return VEHICLE_CLASSES.find(c=>pi>=c.min&&pi<=c.max)?.id||'X';}

const BASE_COST={engine:4200,intake:1800,ecu:2500,fuel:2200,exhaust:2400,turbo:4800,intercooler:2600,cooling:1900,clutch:2100,transmission:3600,differential:3000,tires:2600,brakes:2300,suspension:2900,aero:3400,weight:3300,nitrous:3100,electronics:2400};
export function upgradeCost(vehicle,key){const current=level(vehicle,key);if(current>=5)return null;return Math.round((BASE_COST[key]||3000)*Math.pow(1.62,current));}
export function applyUpgrade(vehicle,key){if(!UPGRADE_KEYS.includes(key))return vehicle;const current=level(vehicle,key);if(current>=5)return vehicle;const v=normalizeVehicle(vehicle);return {...v,upgrades:{...v.upgrades,[key]:current+1}};}
export function tuneVehicle(vehicle,key,value){if(!(key in DEFAULT_TUNE))return normalizeVehicle(vehicle);const v=normalizeVehicle(vehicle);return {...v,tune:{...v.tune,[key]:clamp(Number(value)||0,0,1)}};}

export function createVehicleState(){return {speedMps:0,gear:1,rpm:950,nitrous:1,damage:0,lateral:0,yaw:0};}
export function stepVehicle(vehicle,state,input,dt,environment={grip:1,slope:0}){const s=effectiveSpec(vehicle),next={...state};const throttle=clamp(input.throttle||0,0,1),brake=clamp(input.brake||0,0,1),steer=clamp(input.steer||0,-1,1),nitrous=Boolean(input.nitrous)&&next.nitrous>0;const speed=Math.max(0,next.speedMps),surfaceGrip=clamp(environment.grip??1,.35,1.15);const tcLoss=1-(1-s.tune.tractionControl)*.03*Math.max(0,throttle-.6);const usablePower=(s.powerKwEff+(nitrous?s.nitrousKw:0))*1000*.87;const powerForce=usablePower/Math.max(4,speed);const driveForce=throttle*Math.min(powerForce,tractionForce(s,speed)*surfaceGrip*tcLoss);const braking=brake*s.brakeMuEff*s.massKgEff*G*surfaceGrip;const slopeForce=s.massKgEff*G*Math.sin(environment.slope||0);const net=driveForce-dragForce(s,speed)-rollingForce(s)-braking-slopeForce;next.speedMps=Math.max(0,speed+net/s.massKgEff*dt);if(nitrous)next.nitrous=Math.max(0,next.nitrous-dt*.16);else next.nitrous=Math.min(1,next.nitrous+dt*.025);const steeringFalloff=1/(1+next.speedMps*.055),steerAngle=s.maxSteerRad*s.steeringFactor*steer*(.25+.75*steeringFalloff);const maxYaw=(next.speedMps/Math.max(1.8,s.wheelbaseM))*Math.tan(steerAngle);next.yaw=maxYaw*surfaceGrip*(.73+s.stabilityEff*.27);next.lateral=clamp(next.lateral+steer*dt*(.9+next.speedMps*.025),-1.25,1.25);const ratios=s.gears===5?[3.2,1.95,1.32,.98,.78]:s.gears===7?[3.4,2.25,1.65,1.28,1.03,.84,.7]:[3.35,2.1,1.5,1.16,.92,.75];const wheelRpm=next.speedMps/(2*Math.PI*.33)*60,final=3.4*(.82+s.tune.finalDrive*.36);let gear=1;for(let i=0;i<ratios.length;i++){const rpm=wheelRpm*ratios[i]*final;if(rpm<6900){gear=i+1;break;}gear=ratios.length;}next.gear=gear;next.rpm=clamp(wheelRpm*ratios[gear-1]*final,900,7200);return next;}
