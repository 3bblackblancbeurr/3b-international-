import {eventsFor} from './data.js';
import {createGoldMasterVehicle} from './productionVehicleFactory.js';
import {addVehicleToGarage,createGarageState,saveVehicleSetup} from './garageSystemV2.js';
import {addHeat,createPursuitState,pursuitBudget} from './policePursuitSystem.js';
import {PARISIENNE_MONTARA_ID} from './ParisienneMontaraCandidate.js';

export const FRANCE_VERTICAL_SLICE_ID='u3b-france-gold-slice-v1';
export const FRANCE_VERTICAL_SLICE_VEHICLE_ID=PARISIENNE_MONTARA_ID;

export function createFranceVerticalSliceVehicle(){
  return createGoldMasterVehicle(FRANCE_VERTICAL_SLICE_VEHICLE_ID);
}

export function franceVerticalSliceEvent(){
  const base=eventsFor('france')[0];
  return {...base,verticalSlice:true,verticalSliceId:FRANCE_VERTICAL_SLICE_ID,name:'France Gold Slice · Quais de Justice',weather:'pluie',traffic:'high'};
}

export function createFranceVerticalSlicePursuit(){
  const state=addHeat(createPursuitState({countryId:'france',seed:318}),360);
  return {state,budget:pursuitBudget(state)};
}

export function createFranceVerticalSliceGarage(){
  const vehicle=createFranceVerticalSliceVehicle();
  let garage=addVehicleToGarage(createGarageState(),vehicle.id,{setup:{preset:'france-gold-slice'}});
  garage=saveVehicleSetup(garage,vehicle.id,{preset:'france-gold-slice',country:'france',route:'fr-r1',vehicle:vehicle.id});
  return garage;
}

export function franceVerticalSliceReport(){
  const vehicle=createFranceVerticalSliceVehicle(),event=franceVerticalSliceEvent(),pursuit=createFranceVerticalSlicePursuit(),garage=createFranceVerticalSliceGarage();
  const checks={
    vehicle:vehicle.id===FRANCE_VERTICAL_SLICE_VEHICLE_ID&&vehicle.productionRef===FRANCE_VERTICAL_SLICE_VEHICLE_ID,
    france:event.countryId==='france'&&event.routeId==='fr-r1'&&event.verticalSlice===true,
    race:event.discipline==='rush'&&event.distanceKm>0,
    police:pursuit.state.heat>=4&&pursuit.budget.maxUnits>=6,
    garage:garage.owned.includes(vehicle.id)&&garage.activeVehicleId===vehicle.id,
  };
  return {id:FRANCE_VERTICAL_SLICE_ID,vehicle,event,pursuit,garage,checks,codeReady:Object.values(checks).every(Boolean),goldMasterValidated:false,
    blockers:['LOD0-LOD3 externes','collision mesh dédiée','capture vraie build','validation 60 FPS','QA art finale']};
}
