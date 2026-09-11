// The avatar is roughly 3.8 world units tall. All inhabited doors exceed it;
// storeys, windows, footprints, navigation and cartography use the same scale.
export function buildingDimensions(region,variant=0,urban=true){
 const floors=urban?(region==='france'?3:variant%4===0?3:2):1;
 return {width:urban?12:11,depth:urban?10:9,floors,storey:5.6,height:floors*5.6,doorHeight:4.8,doorWidth:2.5};
}
