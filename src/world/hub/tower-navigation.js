/** Upper tower decks expose their own physical interactions. Ground destinations
 * sharing X/Z with an upper room still require returning through the lift. */
export function hubPhysicalItemsForLevel({towerFloor=null,lifeItems=[],liftItems=[],towerLifeItems=[]}={}){
 return towerFloor?[...liftItems,...towerLifeItems]:[...lifeItems,...liftItems,...towerLifeItems];
}
export function towerDestinationReturnsGround(destination,floor,activePhysicalItems=[]){
 if(!floor)return false;
 const outside=Math.abs(destination.x-floor.x)>floor.width/2-1.25||Math.abs(destination.z-floor.z)>floor.depth/2-1.25;
 const named=!!destination.id;
 // An explicitly listed lift or exhibit belongs to this active deck even when
 // its ground-level entry shares a different X/Z coordinate.
 if(named&&activePhysicalItems.some(item=>item.id===destination.id))return false;
 return outside||named;
}
