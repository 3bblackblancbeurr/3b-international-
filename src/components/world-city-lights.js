// Fixed decorative city-light atlas used only as a painted Earth-night detail.
// Not an operational map of 3B memberships, offices, live traffic or hubs.
// Sparse clusters keep the mobile CPU renderer fast; never geolocate a user.
const BASE_LIGHTS=Object.freeze([
 [-0.12,51.5],[2.35,48.85],[-3.7,40.4],[12.5,41.9],[9.19,45.47],
 [2.17,41.38],[5.37,43.3],[13.4,52.5],[24.75,59.43],[28.98,41.0],
 [32.87,39.9],[-7.59,33.57],[-6.84,34.02],[3.06,36.74],[10.18,36.8],
 [31.24,30.05],[55.27,25.2],[72.88,19.08],[77.2,28.6],[139.69,35.68],
 [116.4,39.9],[126.98,37.57],[103.82,1.35],[100.5,13.75],[121.47,31.23],
 [-74.01,40.71],[-118.24,34.05],[-87.63,41.88],[-99.13,19.43],
 [-46.63,-23.55],[-43.21,-22.9],[-58.38,-34.6],[-70.66,-33.45],
 [36.82,-1.28],[28.05,-26.2],[3.38,6.52],[151.21,-33.87]
]);

export function createCinematicCityLights(){
 const output=[];
 const unit=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
 for(let i=0;i<BASE_LIGHTS.length;i++){
  const [lon,lat]=BASE_LIGHTS[i];
  output.push({lon,lat,brightness:.65+.3*unit(i+1),core:true});
  for(let j=0;j<5;j++){
   const r=.25+1.5*unit(i*11+j+2);
   const theta=2*Math.PI*unit(i*11+j+7);
   output.push({
    lon:lon+Math.cos(theta)*r/Math.max(.34,Math.cos(lat*Math.PI/180)),
    lat:Math.max(-89,Math.min(89,lat+Math.sin(theta)*r)),
    brightness:.2+.43*unit(i*11+j+11),
    core:false
   });
  }
 }
 return Object.freeze(output.map(item=>Object.freeze(item)));
}

export const CINEMATIC_CITY_LIGHTS=createCinematicCityLights();
