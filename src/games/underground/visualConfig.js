export const TARGET_FRAME_MS=1000/60;

export const VISUAL_BUDGETS=Object.freeze({
  frameMs:TARGET_FRAME_MS,
  cpuGameMs:3.0,
  cpuRenderSubmitMs:2.0,
  gpuGeometryMs:3.5,
  gpuLightingMs:4.5,
  gpuPostFxMs:1.8,
  reserveMs:1.87,
  referenceResolution:[3840,2160],
  referenceInternalScale:.67,
  texelDensity:{hero:512,near:256,mid:128,far:64},
  unreal:{heroNaniteSourceTriangles:[2000000,15000000],heroTexturePx:4096,standardTexturePx:2048,smallPropTexturePx:1024}
});

export const QUALITY_PROFILES=Object.freeze({
  low:{pixelRatioMax:1,shadowMap:512,buildings:90,windowClusters:70,rainStreaks:450,atmosphere:180,actualLights:5,decorStride:4},
  medium:{pixelRatioMax:1.25,shadowMap:1024,buildings:145,windowClusters:120,rainStreaks:800,atmosphere:260,actualLights:7,decorStride:3},
  high:{pixelRatioMax:1.6,shadowMap:1536,buildings:210,windowClusters:190,rainStreaks:1200,atmosphere:420,actualLights:9,decorStride:2},
  ultra:{pixelRatioMax:2,shadowMap:2048,buildings:280,windowClusters:260,rainStreaks:1750,atmosphere:620,actualLights:12,decorStride:1}
});

export const COUNTRY_VISUALS=Object.freeze({
  france:{label:'France · Justice',palette:{sky:0x030711,horizon:0x172033,fog:0x07101c,stone:0x3a3b3d,dark:0x07090d,glass:0x111b27,warm:0xffb66e,gold:0xd7b76b,matrix:0x356dff,road:0x11151b,marking:0xe6edf7},wetness:.78,architecture:'heritage',climate:'rain'},
  algeria:{label:'Algérie · Loyauté',palette:{sky:0x04070d,horizon:0x242033,fog:0x0b1018,stone:0x4b4038,dark:0x08090b,glass:0x14202b,warm:0xffc27a,gold:0xd3ab65,matrix:0x2f68dd,road:0x141419,marking:0xf2e6d2},wetness:.28,architecture:'coastal',climate:'dry'},
  spain:{label:'Espagne · Passion',palette:{sky:0x09050a,horizon:0x31151d,fog:0x170910,stone:0x4a3734,dark:0x0b0709,glass:0x17171d,warm:0xff8f52,gold:0xd6aa5d,matrix:0x345eff,road:0x151116,marking:0xf4e7df},wetness:.34,architecture:'mediterranean',climate:'warm'},
  morocco:{label:'Maroc · Noblesse',palette:{sky:0x07060a,horizon:0x2a2018,fog:0x140f0b,stone:0x5d4d3f,dark:0x090807,glass:0x171a1d,warm:0xffc77e,gold:0xdfb968,matrix:0x325ed8,road:0x151310,marking:0xf5ead9},wetness:.16,architecture:'noble',climate:'dry'},
  italy:{label:'Italie · Espoir',palette:{sky:0x04070d,horizon:0x18222c,fog:0x0b1118,stone:0x56504a,dark:0x08090b,glass:0x15202a,warm:0xffc987,gold:0xd8b16a,matrix:0x376ddd,road:0x141619,marking:0xf2eee7},wetness:.38,architecture:'coastal',climate:'mild'},
  tunisia:{label:'Tunisie · Courage',palette:{sky:0x07070b,horizon:0x2b2119,fog:0x15110d,stone:0x5f5041,dark:0x0a0908,glass:0x171c21,warm:0xffb66a,gold:0xd9af62,matrix:0x3268da,road:0x161410,marking:0xf2e6d1},wetness:.12,architecture:'coastal',climate:'dry'},
  turkey:{label:'Turquie · Foi',palette:{sky:0x020611,horizon:0x13233c,fog:0x07101d,stone:0x3c4148,dark:0x06080d,glass:0x0f1b2c,warm:0xffb876,gold:0xd6b16b,matrix:0x2f68ee,road:0x11151c,marking:0xeaf0f7},wetness:.46,architecture:'metropolis',climate:'humid'},
  estonia:{label:'Estonie · Sagesse',palette:{sky:0x02050b,horizon:0x0b1a2a,fog:0x07111d,stone:0x39414b,dark:0x05070b,glass:0x0c1b29,warm:0xbcd5ff,gold:0xc8ae76,matrix:0x4e8cff,road:0x0e141b,marking:0xeaf4ff},wetness:.72,architecture:'nordic',climate:'cold'}
});

export const FRANCE_ZONES=Object.freeze([
  {id:'heritage',name:'Quartier Héritage',start:0,end:.14,background:0x040810,fog:0x0a1019,fogDensity:.0045,warm:.9,cool:.35,wetness:.62,exposure:1.02,landmark:'facades'},
  {id:'quays',name:'Quais de Justice',start:.14,end:.29,background:0x030713,fog:0x07111e,fogDensity:.0049,warm:.76,cool:.52,wetness:.82,exposure:1.06,landmark:'river'},
  {id:'ringroad',name:'Anneau Métropolitain',start:.29,end:.43,background:0x02060e,fog:0x07101a,fogDensity:.0043,warm:.55,cool:.62,wetness:.76,exposure:1.05,landmark:'interchange'},
  {id:'tunnel',name:'Tunnel des Lumières',start:.43,end:.56,background:0x020307,fog:0x07090d,fogDensity:.0033,warm:1.15,cool:.25,wetness:.55,exposure:.96,landmark:'tunnel'},
  {id:'matrix',name:'District Matrix',start:.56,end:.69,background:0x020611,fog:0x06101e,fogDensity:.0052,warm:.28,cool:1.08,wetness:.88,exposure:1.02,landmark:'glass'},
  {id:'alps',name:'Route des Alpes',start:.69,end:.86,background:0x03070c,fog:0x0a141d,fogDensity:.0068,warm:.24,cool:.78,wetness:.68,exposure:1,landmark:'mountain'},
  {id:'celiane',name:'Sanctuaire de Céliane',start:.86,end:1,background:0x03050a,fog:0x0a0d13,fogDensity:.004,warm:.72,cool:.62,wetness:.58,exposure:1.08,landmark:'circle'}
]);

export function zoneAt(progress,countryId='france'){
  const p=((Number(progress)||0)%1+1)%1;
  if(countryId!=='france')return {id:'territory',name:COUNTRY_VISUALS[countryId]?.label||'Territoire 3B',start:0,end:1,wetness:COUNTRY_VISUALS[countryId]?.wetness??.4,exposure:1.03,fogDensity:.0048,warm:.55,cool:.55,landmark:'regional'};
  return FRANCE_ZONES.find((z,i)=>p>=z.start&&(p<z.end||i===FRANCE_ZONES.length-1))||FRANCE_ZONES[0];
}

export function chooseQuality({width=1280,height=720,dpr=1,memoryGb=8,cores=8}={}){
  const pixels=width*height*Math.min(dpr,2)**2;
  if(memoryGb<=4||cores<=4||pixels>8000000)return 'low';
  if(memoryGb<=6||cores<=6||pixels>5000000)return 'medium';
  if(memoryGb>=12&&cores>=8&&pixels<5000000)return 'ultra';
  return 'high';
}
export function internalPixelRatio(profile,dpr=1){return Math.max(.75,Math.min(dpr,QUALITY_PROFILES[profile]?.pixelRatioMax||1.25));}
export function wetRoughness(base=.56,wetness=0){return Math.max(.08,Math.min(1,base*(1-.55*Math.max(0,Math.min(1,wetness)))));}
export function sprayIntensity(speedKph=0,wetness=0,puddleDepth=0){const v=Math.max(0,Math.min(1,speedKph/260)),w=Math.max(0,Math.min(1,wetness)),p=Math.max(0,Math.min(1,puddleDepth));return Math.max(0,Math.min(1,v*w*(.35+.65*p)));}
export function cameraFov(speedKph=0){const t=Math.max(0,Math.min(1,(speedKph-40)/240));return 64+10*(t*t*(3-2*t));}
export function lampCadencePerSecond(speedKph=0,spacingM=8){return Math.max(0,speedKph/3.6)/Math.max(1,spacingM);}
