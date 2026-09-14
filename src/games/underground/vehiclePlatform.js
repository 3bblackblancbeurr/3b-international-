import {CUSTOMIZATION_OPTIONS,CUSTOMIZATION_SLOT_BY_ID,normalizeCustomization} from './customization.js';

export const VEHICLE_PLATFORM_VERSION=1;
export const DEFAULT_PLATFORM_ID='u3b-modular-platform-s1';

const freeze=o=>Object.freeze(o);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec=(x=0,y=0,z=0)=>[x,y,z];

export const PLATFORM_ENVELOPE=freeze({
  lengthM:4.35,widthM:1.92,heightM:1.27,wheelbaseM:2.68,
  trackFrontM:1.62,trackRearM:1.64,wheelDiameterM:.68,wheelWidthM:.255,
  cabinLengthM:1.86,groundClearanceM:.12,
});

export const PLATFORM_MATERIAL_CHANNELS=freeze([
  'bodyPrimary','bodySecondary','accent','carbon','glass','trimBlack','metal','rim','caliper',
  'interior','stitch','headliner','screen','lightFront','lightRear','neon','engineBay','plate',
]);

export const PLATFORM_DECAL_SURFACES=freeze([
  {id:'left',uvSet:1,maxLayers:128},{id:'right',uvSet:1,maxLayers:128},{id:'hood',uvSet:1,maxLayers:128},
  {id:'roof',uvSet:1,maxLayers:128},{id:'rear',uvSet:1,maxLayers:128},{id:'front',uvSet:1,maxLayers:128},
  {id:'glass',uvSet:2,maxLayers:64},
]);

export const PLATFORM_ANCHORS=freeze([
  {id:'chassis.root',group:'chassis',position:vec(0,.28,0)},
  {id:'body.front',group:'exterior',position:vec(0,.54,-1.96)},
  {id:'body.rear',group:'exterior',position:vec(0,.56,1.96)},
  {id:'body.left',group:'exterior',position:vec(-.92,.48,0)},
  {id:'body.right',group:'exterior',position:vec(.92,.48,0)},
  {id:'body.hood',group:'exterior',position:vec(0,.83,-1.18)},
  {id:'body.roof',group:'exterior',position:vec(0,1.22,.08)},
  {id:'body.fenders',group:'exterior',position:vec(0,.65,0)},
  {id:'body.spoiler',group:'exterior',position:vec(0,1.02,1.72)},
  {id:'body.diffuser',group:'exterior',position:vec(0,.30,2.03)},
  {id:'body.mirrors',group:'exterior',position:vec(0,1.02,-.35)},
  {id:'body.grille',group:'exterior',position:vec(0,.53,-2.13)},
  {id:'body.exhaust',group:'exterior',position:vec(0,.31,2.16)},
  {id:'body.handles',group:'exterior',position:vec(0,.80,.22)},
  {id:'wheel.fl',group:'wheels',position:vec(-.81,.36,-1.34)},
  {id:'wheel.fr',group:'wheels',position:vec(.81,.36,-1.34)},
  {id:'wheel.rl',group:'wheels',position:vec(-.82,.36,1.34)},
  {id:'wheel.rr',group:'wheels',position:vec(.82,.36,1.34)},
  {id:'light.front',group:'lighting',position:vec(0,.70,-2.08)},
  {id:'light.drl',group:'lighting',position:vec(0,.76,-2.06)},
  {id:'light.rear',group:'lighting',position:vec(0,.72,2.09)},
  {id:'light.fog',group:'lighting',position:vec(0,.42,-2.08)},
  {id:'light.signal',group:'lighting',position:vec(0,.73,-2.07)},
  {id:'light.underglow',group:'lighting',position:vec(0,.12,0)},
  {id:'interior.seats',group:'interior',position:vec(0,.58,.20)},
  {id:'interior.steering',group:'interior',position:vec(-.34,.86,-.48)},
  {id:'interior.shifter',group:'interior',position:vec(0,.60,-.05)},
  {id:'interior.dashboard',group:'interior',position:vec(0,.82,-.58)},
  {id:'interior.gauges',group:'interior',position:vec(-.25,.88,-.61)},
  {id:'interior.headliner',group:'interior',position:vec(0,1.18,.08)},
  {id:'interior.floor',group:'interior',position:vec(0,.34,.12)},
  {id:'interior.cage',group:'interior',position:vec(0,.82,.32)},
  {id:'interior.pedals',group:'interior',position:vec(-.30,.36,-.72)},
  {id:'audio.headunit',group:'interior',position:vec(0,.80,-.57)},
  {id:'audio.speakers',group:'interior',position:vec(0,.66,.25)},
  {id:'audio.subwoofer',group:'trunk',position:vec(0,.52,1.40)},
  {id:'audio.amplifier',group:'trunk',position:vec(0,.52,1.15)},
  {id:'audio.trunk',group:'trunk',position:vec(0,.48,1.34)},
  {id:'engine.cover',group:'engineBay',position:vec(0,.67,-1.02)},
  {id:'engine.intake',group:'engineBay',position:vec(.28,.60,-1.10)},
  {id:'engine.strutBrace',group:'engineBay',position:vec(0,.73,-.82)},
  {id:'engine.hoses',group:'engineBay',position:vec(-.26,.59,-1.05)},
  {id:'engine.caps',group:'engineBay',position:vec(.18,.66,-.84)},
  {id:'identity.plate',group:'identity',position:vec(0,.48,2.16)},
  {id:'identity.towHook',group:'identity',position:vec(.52,.34,-2.15)},
  {id:'identity.antenna',group:'identity',position:vec(0,1.35,.72)},
  {id:'identity.badges',group:'identity',position:vec(0,.70,2.10)},
]);
export const PLATFORM_ANCHOR_BY_ID=freeze(Object.fromEntries(PLATFORM_ANCHORS.map(a=>[a.id,a])));

const SLOT_ANCHOR=freeze({
  frontBumper:'body.front',rearBumper:'body.rear',sideSkirts:'body.left',hood:'body.hood',roof:'body.roof',fenders:'body.fenders',spoiler:'body.spoiler',diffuser:'body.diffuser',mirrors:'body.mirrors',grille:'body.grille',exhaustTips:'body.exhaust',doorHandles:'body.handles',
  rims:'wheel.fl',rimFinish:'wheel.fl',tiresVisual:'wheel.fl',calipers:'wheel.fl',rotors:'wheel.fl',
  headlights:'light.front',drl:'light.drl',taillights:'light.rear',fogLights:'light.fog',turnSignals:'light.signal',underglowHardware:'light.underglow',
  finish:'chassis.root',carbonPattern:'chassis.root',glassTint:'body.roof',
  seats:'interior.seats',seatMaterial:'interior.seats',steeringWheel:'interior.steering',shiftKnob:'interior.shifter',dashboardTrim:'interior.dashboard',gauges:'interior.gauges',headliner:'interior.headliner',floorMats:'interior.floor',rollCage:'interior.cage',pedals:'interior.pedals',
  headUnit:'audio.headunit',speakers:'audio.speakers',subwoofer:'audio.subwoofer',amplifier:'audio.amplifier',trunkInstall:'audio.trunk',
  engineCover:'engine.cover',intakeVisual:'engine.intake',strutBrace:'engine.strutBrace',hoses:'engine.hoses',caps:'engine.caps',
  plateFrame:'identity.plate',towHook:'identity.towHook',antenna:'identity.antenna',badges:'identity.badges',
});

const MATERIAL_ONLY=new Set(['rimFinish','finish','carbonPattern','glassTint','seatMaterial','dashboardTrim','headliner','floorMats','hoses','caps']);
const MULTI_ANCHOR=new Set(['rims','rimFinish','tiresVisual','calipers','rotors']);

export function slotBinding(slotId){
  const slot=CUSTOMIZATION_SLOT_BY_ID[slotId];if(!slot)return null;
  const anchor=SLOT_ANCHOR[slotId]||'chassis.root';
  return {slotId,category:slot.category,anchor,kind:MATERIAL_ONLY.has(slotId)?'material':'mesh',multiAnchor:MULTI_ANCHOR.has(slotId)};
}

export const DEFAULT_PLATFORM_MANIFEST=freeze({
  id:DEFAULT_PLATFORM_ID,version:VEHICLE_PLATFORM_VERSION,label:'3B Modular Sports Platform S1',
  assetRoot:null,skeletonAsset:null,chassisAsset:null,collisionAsset:null,cockpitAsset:null,engineBayAsset:null,trunkAsset:null,
  envelope:PLATFORM_ENVELOPE,anchors:PLATFORM_ANCHORS,materialChannels:PLATFORM_MATERIAL_CHANNELS,decalSurfaces:PLATFORM_DECAL_SURFACES,
  supportedSlots:Object.fromEntries(Object.keys(CUSTOMIZATION_SLOT_BY_ID).map(id=>[id,slotBinding(id)])),
  requirements:{wheelCount:4,steeringWheels:['fl','fr'],drivenAxles:['rear'],requiresUV1:true,requiresUV2ForGlass:true,requiresInterior:true},
});

export const PLATFORM_REGISTRY=freeze({[DEFAULT_PLATFORM_ID]:DEFAULT_PLATFORM_MANIFEST});

export function normalizePlatformId(value){return PLATFORM_REGISTRY[value]?value:DEFAULT_PLATFORM_ID;}
export function getPlatformManifest(id=DEFAULT_PLATFORM_ID){return PLATFORM_REGISTRY[normalizePlatformId(id)];}

export function normalizePartAssetManifest(value){
  const v=value&&typeof value==='object'?value:{};const slotId=CUSTOMIZATION_SLOT_BY_ID[v.slotId]?v.slotId:null;
  return {id:typeof v.id==='string'?v.id:'',slotId,assetRef:typeof v.assetRef==='string'&&v.assetRef?v.assetRef:null,
    platformIds:Array.isArray(v.platformIds)?v.platformIds.filter(id=>PLATFORM_REGISTRY[id]):[DEFAULT_PLATFORM_ID],
    materialChannels:Array.isArray(v.materialChannels)?v.materialChannels.filter(x=>PLATFORM_MATERIAL_CHANNELS.includes(x)):[],
    anchorOverride:typeof v.anchorOverride==='string'&&PLATFORM_ANCHOR_BY_ID[v.anchorOverride]?v.anchorOverride:null,
    scaleRange:Array.isArray(v.scaleRange)&&v.scaleRange.length===2?[clamp(Number(v.scaleRange[0])||.8,.4,2),clamp(Number(v.scaleRange[1])||1.2,.4,2)]:[.8,1.2]};
}

export function partCompatibility(platformId,partManifest){
  const p=getPlatformManifest(platformId),part=normalizePartAssetManifest(partManifest);if(!part.slotId)return {ok:false,reason:'slot-unknown'};
  if(!part.platformIds.includes(p.id))return {ok:false,reason:'platform-unsupported'};
  if(!p.supportedSlots[part.slotId])return {ok:false,reason:'slot-unsupported'};
  return {ok:true,reason:null,anchor:part.anchorOverride||p.supportedSlots[part.slotId].anchor};
}

export function calculateStanceTransforms(customization,envelope=PLATFORM_ENVELOPE){
  const c=normalizeCustomization(customization),s=c.stance;
  const diameter=envelope.wheelDiameterM*(.88+s.wheelDiameter*.24),width=envelope.wheelWidthM*(.82+s.wheelWidth*.36);
  const ride=(s.rideHeight-.5)*-.12,frontTrack=envelope.trackFrontM+(.5-s.frontOffset)*.06+(s.frontTrack-.5)*.12,rearTrack=envelope.trackRearM+(.5-s.rearOffset)*.06+(s.rearTrack-.5)*.12;
  const camberF=(s.frontCamber-.5)*-.16,camberR=(s.rearCamber-.5)*-.16;
  return {diameterM:diameter,widthM:width,rideOffsetM:ride,wheels:{
    fl:{position:[-frontTrack/2,diameter/2+ride,-envelope.wheelbaseM/2],camberRad:camberF},fr:{position:[frontTrack/2,diameter/2+ride,-envelope.wheelbaseM/2],camberRad:-camberF},
    rl:{position:[-rearTrack/2,diameter/2+ride,envelope.wheelbaseM/2],camberRad:camberR},rr:{position:[rearTrack/2,diameter/2+ride,envelope.wheelbaseM/2],camberRad:-camberR},
  }};
}

export function resolveVehicleAssembly(vehicle){
  const platform=getPlatformManifest(vehicle?.platformId),customization=normalizeCustomization(vehicle?.customization),parts=[];
  for(const [slotId,optionId] of Object.entries(customization.selections)){
    const binding=platform.supportedSlots[slotId]||slotBinding(slotId),option=CUSTOMIZATION_OPTIONS.find(o=>o.id===optionId)||null;
    if(!binding||!option)continue;parts.push({slotId,optionId,label:option.label,category:option.category,kind:binding.kind,anchor:binding.anchor,multiAnchor:binding.multiAnchor,assetRef:option.assetRef||null});
  }
  return {platformId:platform.id,platformVersion:platform.version,envelope:platform.envelope,customization,parts,stance:calculateStanceTransforms(customization,platform.envelope),
    materialBindings:{bodyPrimary:customization.colors.primary,bodySecondary:customization.colors.secondary,accent:customization.colors.accent,interior:customization.colors.interior,stitch:customization.colors.stitch,caliper:customization.colors.caliper,lightFront:customization.colors.light,neon:customization.neon.color},
    decals:{vinylLayers:customization.vinylLayers,stickers:customization.stickers},
  };
}

export function platformReadinessReport(vehicle){
  const platform=getPlatformManifest(vehicle?.platformId),assembly=resolveVehicleAssembly(vehicle),missingCore=['chassisAsset','collisionAsset','cockpitAsset'].filter(k=>!platform[k]);
  const missingSelectedParts=assembly.parts.filter(p=>p.kind==='mesh'&&!p.assetRef).length;
  return {platformId:platform.id,version:platform.version,totalSlots:Object.keys(platform.supportedSlots).length,selectedParts:assembly.parts.length,missingCore,missingSelectedParts,
    materialChannels:platform.materialChannels.length,decalSurfaces:platform.decalSurfaces.length,anchors:platform.anchors.length,
    dataReady:missingCore.length===3&&assembly.parts.length===Object.keys(platform.supportedSlots).length,artReady:missingCore.length===0&&missingSelectedParts===0};
}

export function validatePlatformContract(){
  const missingSlots=Object.keys(CUSTOMIZATION_SLOT_BY_ID).filter(id=>!DEFAULT_PLATFORM_MANIFEST.supportedSlots[id]);
  const invalidAnchors=Object.values(DEFAULT_PLATFORM_MANIFEST.supportedSlots).filter(x=>!PLATFORM_ANCHOR_BY_ID[x.anchor]).map(x=>x.slotId);
  return {ok:missingSlots.length===0&&invalidAnchors.length===0,missingSlots,invalidAnchors,slotCount:Object.keys(DEFAULT_PLATFORM_MANIFEST.supportedSlots).length,anchorCount:PLATFORM_ANCHORS.length};
}
