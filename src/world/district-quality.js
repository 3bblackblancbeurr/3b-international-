/** Detailed buildings are reserved for devices that can afford their geometry.
 * The low models remain available in every quality mode. */
export function districtHighDetailAllowed(mode='auto',capabilities={}){
 return capabilities.desktopClass===true&&(mode==='auto'||mode==='detail');
}
