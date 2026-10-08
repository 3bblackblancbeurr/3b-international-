// One predictable city-window curve. Night ambience must not alter progression.
// Uses material emission, not a new PointLight per inhabited room.
export function civicWindowGlow(daylight=1){
 const day=Number.isFinite(daylight)?Math.max(0,Math.min(1,daylight)):1;
 return .018+.38*Math.pow(1-day,1.3);
}
