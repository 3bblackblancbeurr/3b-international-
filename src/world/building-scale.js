// The avatar is roughly 3.8 world units tall. All inhabited doors exceed it;
// storeys, windows, footprints, navigation and cartography use the same scale.
export function buildingDimensions(region,variant=0,urban=true){
 const type=((variant%5)+5)%5;
 const floors=urban?(region==='france'?[3,2,4,3,2][type]:region==='estonie'?[2,2,3,2,1][type]:[2,3,2,1,2][type]):1;
 return {width:urban?[11,13.2,11.2,12.8,11.6][type]:[11,12,11.5][variant%3],depth:urban?[9.6,10.8,9.2,10.4,11][type]:9,floors,storey:5.6,height:floors*5.6,doorHeight:4.8,doorWidth:2.5};
}
