import {PLATFORM_ANCHOR_BY_ID,resolveVehicleAssembly} from './vehiclePlatform.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export const VEHICLE_MECHANISMS=Object.freeze({
  hood:{id:'hood',label:'Capot',anchor:'body.hood',axis:[1,0,0],closedRad:0,openRad:-1.02,exposes:['engine.cover','engine.intake','engine.strutBrace','engine.hoses','engine.caps']},
  trunk:{id:'trunk',label:'Coffre',anchor:'body.rear',axis:[1,0,0],closedRad:0,openRad:1.08,exposes:['audio.subwoofer','audio.amplifier','audio.trunk']},
  doorLeft:{id:'doorLeft',label:'Porte gauche',anchor:'body.left',axis:[0,1,0],closedRad:0,openRad:-1.12,exposes:['interior.seats','interior.steering','interior.dashboard','audio.headunit']},
  doorRight:{id:'doorRight',label:'Porte droite',anchor:'body.right',axis:[0,1,0],closedRad:0,openRad:1.12,exposes:['interior.seats','interior.dashboard','audio.headunit']},
});

export const INSPECTION_PRESETS=Object.freeze({
  exterior:{id:'exterior',label:'Vue extérieure',target:[0,.72,0],camera:[4.8,2.3,-5.6],fov:42,open:[]},
  front:{id:'front',label:'Avant / phares',target:[0,.66,-1.70],camera:[2.8,1.35,-4.4],fov:38,open:[]},
  wheels:{id:'wheels',label:'Roues & stance',target:[-.80,.38,-1.20],camera:[-3.0,1.0,-3.0],fov:34,open:[]},
  cockpit:{id:'cockpit',label:'Habitacle',target:[0,.82,-.05],camera:[2.0,1.35,-1.9],fov:40,open:['doorRight']},
  seats:{id:'seats',label:'Fauteuils',target:[0,.72,.22],camera:[2.1,1.30,.15],fov:36,open:['doorRight']},
  multimedia:{id:'multimedia',label:'Radio / écrans',target:[0,.82,-.57],camera:[1.65,1.16,-1.28],fov:32,open:['doorRight']},
  trunkAudio:{id:'trunkAudio',label:'Audio coffre',target:[0,.54,1.34],camera:[2.5,1.45,3.35],fov:37,open:['trunk']},
  engineBay:{id:'engineBay',label:'Baie moteur',target:[0,.66,-1.03],camera:[2.55,1.75,-3.15],fov:37,open:['hood']},
  lighting:{id:'lighting',label:'Éclairage',target:[0,.60,-1.35],camera:[3.3,1.45,-4.0],fov:42,open:[]},
  liveryLeft:{id:'liveryLeft',label:'Livrée gauche',target:[-.72,.70,0],camera:[-4.5,1.8,0],fov:38,open:[]},
});

export function mechanismPose(id,amount=1){
  const m=VEHICLE_MECHANISMS[id];if(!m)return null;const t=clamp(Number(amount)||0),angle=m.closedRad+(m.openRad-m.closedRad)*t,anchor=PLATFORM_ANCHOR_BY_ID[m.anchor]||null;
  return {...m,amount:t,angleRad:angle,anchorPosition:anchor?.position||[0,0,0]};
}

export function inspectionState(vehicle,presetId='exterior',openAmount=1){
  const preset=INSPECTION_PRESETS[presetId]||INSPECTION_PRESETS.exterior,assembly=resolveVehicleAssembly(vehicle),mechanisms=Object.fromEntries(Object.keys(VEHICLE_MECHANISMS).map(id=>[id,mechanismPose(id,preset.open.includes(id)?openAmount:0)]));
  const visibleGroups=new Set(['chassis','exterior','wheels','lighting','identity']);
  if(['cockpit','seats','multimedia'].includes(preset.id))visibleGroups.add('interior');
  if(preset.id==='trunkAudio')visibleGroups.add('trunk');
  if(preset.id==='engineBay')visibleGroups.add('engineBay');
  return {preset,assembly,mechanisms,visibleGroups:[...visibleGroups]};
}

export function validateInspectionContract(){
  const missing=[];for(const m of Object.values(VEHICLE_MECHANISMS))if(!PLATFORM_ANCHOR_BY_ID[m.anchor])missing.push(`${m.id}:${m.anchor}`);
  return {ok:missing.length===0,mechanisms:Object.keys(VEHICLE_MECHANISMS).length,presets:Object.keys(INSPECTION_PRESETS).length,missing};
}
