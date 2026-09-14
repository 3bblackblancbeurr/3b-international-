import {VEHICLE_CLASSES} from './data.js';

const G=9.80665,RHO=1.225;
export const UPGRADE_KEYS=['engine','turbo','transmission','tires','brakes','suspension','aero','nitrous'];

export const DEFAULT_VEHICLE={
  id:'prototype-01',name:'Prototype 3B',modelAsset:null,
  massKg:1420,powerKw:170,torqueNm:330,drive:'RWD',gears:6,
  cd:0.31,frontalAreaM2:2.08,rollingResistance:0.012,
  tireMu:1.04,brakeMu:1.15,wheelbaseM:2.68,maxSteerRad:0.57,
  downforceCoeff:0.12,response:0.76,stability:0.78,
  upgrades:Object.fromEntries(UPGRADE_KEYS.map(k=>[k,0])),
  tune:{finalDrive:1,brakeBias:0.58,suspension:0.5,differential:0.5,aeroBalance:0.5,tirePressure:0.5},
};

const level=(vehicle,key)=>Math.max(0,Math.min(5,Number(vehicle?.upgrades?.[key])||0));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function effectiveSpec(vehicle=DEFAULT_VEHICLE){
  const v={...DEFAULT_VEHICLE,...vehicle,upgrades:{...DEFAULT_VEHICLE.upgrades,...vehicle?.upgrades},tune:{...DEFAULT_VEHICLE.tune,...vehicle?.tune}};
  const engine=level(v,'engine'),turbo=level(v,'turbo'),trans=level(v,'transmission'),tires=level(v,'tires'),brakes=level(v,'brakes'),susp=level(v,'suspension'),aero=level(v,'aero'),nitrous=level(v,'nitrous');
  const power=v.powerKw*(1+engine*.055+turbo*.072+trans*.008);
  const mass=Math.max(900,v.massKg*(1-trans*.006));
  const tireMu=v.tireMu*(1+tires*.045+susp*.018)*(0.96+v.tune.tirePressure*.08);
  const brakeMu=v.brakeMu*(1+brakes*.055)*(0.98+Math.abs(v.tune.brakeBias-.58)*-.08);
  const cd=v.cd*(1+aero*.006+(v.tune.aeroBalance-.5)*.025);
  const downforce=v.downforceCoeff+aero*.055+v.tune.aeroBalance*.06;
  const response=clamp(v.response+engine*.012+turbo*.008+trans*.028+susp*.016,0,1.25);
  const nitrousKw=nitrous?28+nitrous*18:0;
  return {...v,powerKwEff:power,massKgEff:mass,tireMuEff:tireMu,brakeMuEff:brakeMu,cdEff:cd,downforceCoeffEff:downforce,responseEff:response,nitrousKw};
}

function dragForce(spec,speed){return .5*RHO*spec.cdEff*spec.frontalAreaM2*speed*speed;}
function rollingForce(spec){return spec.rollingResistance*spec.massKgEff*G;}
function tractionForce(spec,speed){
  const downforce=.5*RHO*spec.frontalAreaM2*spec.downforceCoeffEff*speed*speed;
  const driven=spec.drive==='AWD'?1:spec.drive==='FWD'?.58:.62;
  return spec.tireMuEff*(spec.massKgEff*G*driven+downforce*.62);
}

export function estimateTopSpeedKph(vehicle=DEFAULT_VEHICLE){
  const s=effectiveSpec(vehicle),power=s.powerKwEff*1000*.88;
  let lo=5,hi=130;
  for(let i=0;i<50;i++){
    const mid=(lo+hi)/2,need=dragForce(s,mid)*mid+rollingForce(s)*mid;
    if(need<power)lo=mid;else hi=mid;
  }
  return Math.round(lo*3.6);
}

export function estimateZeroToHundred(vehicle=DEFAULT_VEHICLE){
  const s=effectiveSpec(vehicle);let speed=0,time=0,dt=.01;
  while(speed<27.7778&&time<20){
    const usablePower=s.powerKwEff*1000*.87;
    const powerForce=usablePower/Math.max(4,speed);
    const force=Math.min(powerForce,tractionForce(s,speed))-dragForce(s,speed)-rollingForce(s);
    speed=Math.max(0,speed+Math.max(0,force/s.massKgEff)*dt);time+=dt;
  }
  return Number(time.toFixed(2));
}

export function performanceIndex(vehicle=DEFAULT_VEHICLE){
  const s=effectiveSpec(vehicle),top=estimateTopSpeedKph(s),zero=estimateZeroToHundred(s);
  const accel=clamp((9.5-zero)/7,0,1.25),speed=clamp((top-150)/260,0,1.25);
  const grip=clamp((s.tireMuEff-.75)/.75,0,1.25),brake=clamp((s.brakeMuEff-.8)/.75,0,1.25);
  const response=clamp(s.responseEff/1.15,0,1.2),aero=clamp((s.downforceCoeffEff+.05)/.55,0,1.25);
  const raw=100+899*(accel*.27+speed*.22+grip*.2+brake*.13+response*.1+aero*.08);
  return clamp(Math.round(raw),100,999);
}

export function vehicleClass(vehicle=DEFAULT_VEHICLE){
  const pi=performanceIndex(vehicle);
  return VEHICLE_CLASSES.find(c=>pi>=c.min&&pi<=c.max)?.id||'X';
}

export function upgradeCost(vehicle,key){
  const current=level(vehicle,key);
  if(current>=5)return null;
  const base={engine:4200,turbo:4800,transmission:3600,tires:2600,brakes:2300,suspension:2900,aero:3400,nitrous:3100}[key]||3000;
  return Math.round(base*Math.pow(1.62,current));
}

export function applyUpgrade(vehicle,key){
  if(!UPGRADE_KEYS.includes(key))return vehicle;
  const current=level(vehicle,key);if(current>=5)return vehicle;
  return {...vehicle,upgrades:{...vehicle.upgrades,[key]:current+1}};
}

export function tuneVehicle(vehicle,key,value){
  if(!(key in DEFAULT_VEHICLE.tune))return vehicle;
  return {...vehicle,tune:{...vehicle.tune,[key]:clamp(Number(value)||0,0,1)}};
}

export function createVehicleState(){return {speedMps:0,gear:1,rpm:950,nitrous:1,damage:0,lateral:0,yaw:0};}

export function stepVehicle(vehicle,state,input,dt,environment={grip:1,slope:0}){
  const s=effectiveSpec(vehicle),next={...state};
  const throttle=clamp(input.throttle||0,0,1),brake=clamp(input.brake||0,0,1),steer=clamp(input.steer||0,-1,1),nitrous=Boolean(input.nitrous)&&next.nitrous>0;
  const speed=Math.max(0,next.speedMps),surfaceGrip=clamp(environment.grip??1,.35,1.15);
  const usablePower=(s.powerKwEff+(nitrous?s.nitrousKw:0))*1000*.87;
  const powerForce=usablePower/Math.max(4,speed);
  const driveForce=throttle*Math.min(powerForce,tractionForce(s,speed)*surfaceGrip);
  const braking=brake*s.brakeMuEff*s.massKgEff*G*surfaceGrip;
  const slopeForce=s.massKgEff*G*Math.sin(environment.slope||0);
  const net=driveForce-dragForce(s,speed)-rollingForce(s)-braking-slopeForce;
  next.speedMps=Math.max(0,speed+net/s.massKgEff*dt);
  if(nitrous)next.nitrous=Math.max(0,next.nitrous-dt*.16);else next.nitrous=Math.min(1,next.nitrous+dt*.025);
  const steeringFalloff=1/(1+next.speedMps*.055),steerAngle=s.maxSteerRad*steer*(.25+.75*steeringFalloff);
  const maxYaw=(next.speedMps/Math.max(1.8,s.wheelbaseM))*Math.tan(steerAngle);
  next.yaw=maxYaw*surfaceGrip*(.75+s.stability*.25);
  next.lateral=clamp(next.lateral+steer*dt*(.9+next.speedMps*.025),-1.25,1.25);
  const ratios=s.gears===5?[3.2,1.95,1.32,.98,.78]:s.gears===7?[3.4,2.25,1.65,1.28,1.03,.84,.7]:[3.35,2.1,1.5,1.16,.92,.75];
  const wheelRpm=next.speedMps/(2*Math.PI*.33)*60,final=3.4*(.82+s.tune.finalDrive*.36);
  let gear=1;for(let i=0;i<ratios.length;i++){const rpm=wheelRpm*ratios[i]*final;if(rpm<6900){gear=i+1;break;}gear=ratios.length;}
  next.gear=gear;next.rpm=clamp(wheelRpm*ratios[gear-1]*final,900,7200);
  return next;
}
