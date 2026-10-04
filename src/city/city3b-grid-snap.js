// Terrain coordinates, building parcel origins and road nodes share the same metre grid.
export const CITY_GRID_UNIT=1;
export function cityGridPoint(point){
 return {x:Math.round(point.x/CITY_GRID_UNIT)*CITY_GRID_UNIT,z:Math.round(point.z/CITY_GRID_UNIT)*CITY_GRID_UNIT};
}
export function cityDrawingEndpoint(features){
 const last=features.at(-1);
 return last?{x:last.x2,z:last.z2}:null;
}
