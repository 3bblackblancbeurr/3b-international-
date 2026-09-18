const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const DRIVING_INPUT_V2=Object.freeze({
  throttleRise:3.35,
  throttleFall:7.4,
  brakeRise:7.2,
  brakeFall:10.5,
  steerRiseLowSpeed:10.5,
  steerRiseHighSpeed:6.2,
  steerReturn:13.5,
  steerDeadZone:.055,
  steerCurve:1.28,
  highSpeedSteerFloor:.42,
});

const expAlpha=(rate,dt)=>1-Math.exp(-Math.max(0,rate)*Math.max(0,dt));
const approach=(current,target,rate,dt)=>current+(target-current)*expAlpha(rate,dt);

export function shapeAnalog(value,deadZone=DRIVING_INPUT_V2.steerDeadZone,curve=DRIVING_INPUT_V2.steerCurve){
  const v=clamp(Number(value)||0,-1,1),a=Math.abs(v);
  if(a<=deadZone)return 0;
  const normalized=clamp((a-deadZone)/(1-deadZone),0,1);
  return Math.sign(v)*Math.pow(normalized,curve);
}

export function steeringAuthority(speedMps=0){
  const speedKph=Math.max(0,Number(speedMps)||0)*3.6;
  const t=clamp(speedKph/240,0,1);
  const eased=t*t*(3-2*t);
  return 1-(1-DRIVING_INPUT_V2.highSpeedSteerFloor)*eased;
}

export function createDrivingControlState(){
  return {throttle:0,brake:0,steer:0};
}

export function updateDrivingControlState(current=createDrivingControlState(),raw={},dt=1/60,speedMps=0){
  const throttleTarget=clamp(Number(raw.throttle)||0,0,1);
  const brakeTarget=clamp(Number(raw.brake)||0,0,1);
  const steerTarget=shapeAnalog(raw.steer)*steeringAuthority(speedMps);
  const throttleRate=throttleTarget>current.throttle?DRIVING_INPUT_V2.throttleRise:DRIVING_INPUT_V2.throttleFall;
  const brakeRate=brakeTarget>current.brake?DRIVING_INPUT_V2.brakeRise:DRIVING_INPUT_V2.brakeFall;
  const speedT=clamp((Number(speedMps)||0)/65,0,1);
  const steerRise=DRIVING_INPUT_V2.steerRiseLowSpeed+(DRIVING_INPUT_V2.steerRiseHighSpeed-DRIVING_INPUT_V2.steerRiseLowSpeed)*speedT;
  const steerRate=Math.abs(steerTarget)<Math.abs(current.steer)?DRIVING_INPUT_V2.steerReturn:steerRise;
  return {
    throttle:clamp(approach(current.throttle,throttleTarget,throttleRate,dt),0,1),
    brake:clamp(approach(current.brake,brakeTarget,brakeRate,dt),0,1),
    steer:clamp(approach(current.steer,steerTarget,steerRate,dt),-1,1),
  };
}
